const axios = require('axios');

const API_SPORTS_KEY = process.env.API_SPORTS_KEY || '1fc6485365cd4c504dc63f172a37838b';
const BASEBALL_API_BASE = 'https://v1.baseball.api-sports.io';
const MLB_LEAGUE_ID = 1;

const SPHERE_ACCOUNTS = [
    {
        server: process.env.IPTV_SERVER || 's.rocketdns.info',
        port: process.env.IPTV_PORT || '8080',
        user: process.env.IPTV_USER || '5986529',
        pass: process.env.IPTV_PASS || '0044003',
        protocol: process.env.IPTV_PROTOCOL || 'http',
        label: 'sphere-1'
    },
];
const PRIMARY = SPHERE_ACCOUNTS[0];
const VPS_STREAM_BASE = process.env.VPS_STREAM_URL || 'https://stream.nobarmeriah.com';

const MLB_CATEGORIES = [
    { id: '136', name: 'USA MLB' },
    { id: '356', name: 'NCAA BASEBALL' },
];

const SPORTS_TV_CHANNELS = [
    { stream_id: 3636, name: 'ESPN UHD', league: 'MLB' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'MLB' },
    { stream_id: 2501, name: 'Fox Sports 1 (SHD)', league: 'MLB' },
    { stream_id: 2500, name: 'Fox Sports 2', league: 'MLB' },
];

// MLB Team abbreviations
const MLB_TEAMS = {
    'BAL': 'Baltimore Orioles', 'BOS': 'Boston Red Sox', 'NYY': 'New York Yankees',
    'TBR': 'Tampa Bay Rays', 'TB': 'Tampa Bay Rays', 'TOR': 'Toronto Blue Jays',
    'CHW': 'Chicago White Sox', 'CWS': 'Chicago White Sox', 'CLE': 'Cleveland Guardians',
    'DET': 'Detroit Tigers', 'KCR': 'Kansas City Royals', 'KC': 'Kansas City Royals',
    'MIN': 'Minnesota Twins',
    'HOU': 'Houston Astros', 'LAA': 'Los Angeles Angels', 'OAK': 'Oakland Athletics',
    'SEA': 'Seattle Mariners', 'TEX': 'Texas Rangers',
    'ATL': 'Atlanta Braves', 'MIA': 'Miami Marlins', 'NYM': 'New York Mets',
    'PHI': 'Philadelphia Phillies', 'WSN': 'Washington Nationals', 'WAS': 'Washington Nationals',
    'CHC': 'Chicago Cubs', 'CIN': 'Cincinnati Reds', 'MIL': 'Milwaukee Brewers',
    'PIT': 'Pittsburgh Pirates', 'STL': 'St. Louis Cardinals',
    'ARI': 'Arizona Diamondbacks', 'AZ': 'Arizona Diamondbacks', 'COL': 'Colorado Rockies',
    'LAD': 'Los Angeles Dodgers', 'SDP': 'San Diego Padres', 'SD': 'San Diego Padres',
    'SFG': 'San Francisco Giants', 'SF': 'San Francisco Giants',
};

const NAME_TO_ABBR = {};
Object.entries(MLB_TEAMS).forEach(([abbr, name]) => {
    if (!NAME_TO_ABBR[name.toLowerCase()]) NAME_TO_ABBR[name.toLowerCase()] = [];
    NAME_TO_ABBR[name.toLowerCase()].push(abbr);
});

// ========================
// CACHE
// ========================
let fixturesCache = { data: null, lastFetch: null, ttl: 2 * 60 * 1000 };
let sphereCache = { data: null, lastFetch: null, ttl: 5 * 60 * 1000 };

// ========================
// FETCH MLB FIXTURES
// ========================
async function fetchMLBFixtures() {
    const now = Date.now();
    if (fixturesCache.data && fixturesCache.lastFetch && (now - fixturesCache.lastFetch < fixturesCache.ttl)) {
        return fixturesCache.data;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const currentYear = new Date().getFullYear();
        const response = await axios.get(`${BASEBALL_API_BASE}/games`, {
            headers: { 'x-apisports-key': API_SPORTS_KEY },
            params: { league: MLB_LEAGUE_ID, date: today, season: currentYear },
            timeout: 10000
        });

        if (response.data?.response) {
            fixturesCache.data = response.data.response;
            fixturesCache.lastFetch = now;
            console.log(`[Baseball API] Fetched ${response.data.response.length} MLB games for ${today}`);
            return response.data.response;
        }
        return [];
    } catch (err) {
        console.error('[Baseball API] Error:', err.message);
        return fixturesCache.data || [];
    }
}

// ========================
// FETCH SPHERE CHANNELS
// ========================
async function fetchSphereChannels(account) {
    const acc = account || PRIMARY;
    const now = Date.now();

    if (acc === PRIMARY && sphereCache.data && sphereCache.lastFetch && (now - sphereCache.lastFetch < sphereCache.ttl)) {
        return sphereCache.data;
    }

    const allChannels = [];

    for (const category of MLB_CATEGORIES) {
        try {
            const response = await axios.get(`${acc.protocol}://${acc.server}:${acc.port}/player_api.php`, {
                params: {
                    username: acc.user, password: acc.pass,
                    action: 'get_live_streams', category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data
                    .filter(ch => ch.name && !/test|backup|offline/i.test(ch.name))
                    .map(ch => ({
                        id: ch.stream_id, name: ch.name,
                        category: category.name, icon: ch.stream_icon || null, provider: 'sphere'
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`[Sphere] Error fetching MLB cat ${category.id}:`, err.message);
        }
    }

    const seen = new Set();
    const unique = allChannels.filter(ch => { if (seen.has(ch.id)) return false; seen.add(ch.id); return true; });

    if (acc === PRIMARY) { sphereCache.data = unique; sphereCache.lastFetch = now; }
    console.log(`[Sphere] Fetched ${unique.length} MLB channels`);
    return unique;
}

// ========================
// CHANNEL PARSING + MATCHING
// ========================
function extractTeamInfo(channelName) {
    if (!channelName) return { home: null, away: null, feed: null };

    let clean = channelName;
    clean = clean.replace(/^USA\s*(Real\s*)?MLB\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^MLB\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^NCAA\s*Baseball\s*\d*\s*[-:]?\s*/i, '');

    let feed = null;
    const feedMatch = clean.match(/\(([^)]+)\)/);
    if (feedMatch) { feed = feedMatch[1].trim(); clean = clean.replace(/\([^)]*\)/, '').trim(); }

    clean = clean.replace(/\s*@\s*[\d:]+\s*(AM|PM)?.*$/i, '').trim();

    const vsMatch = clean.match(/(.+?)\s+(?:vs\.?|VS|@)\s+(.+)/i);
    if (vsMatch) {
        return { home: vsMatch[1].trim(), away: vsMatch[2].trim(), feed };
    }

    return { home: clean.trim() || null, away: null, feed };
}

function findStreamForFixture(fixture, channels) {
    const homeTeam = fixture.teams?.home?.name?.toLowerCase() || '';
    const awayTeam = fixture.teams?.away?.name?.toLowerCase() || '';

    const homeWords = homeTeam.split(' ').filter(w => w.length > 3);
    const awayWords = awayTeam.split(' ').filter(w => w.length > 3);
    const homeAbbrs = NAME_TO_ABBR[homeTeam] || [];
    const awayAbbrs = NAME_TO_ABBR[awayTeam] || [];

    const matchedStreams = [];

    for (const channel of channels) {
        const channelLower = channel.name.toLowerCase();
        let isMatch = false;

        for (const abbr of [...homeAbbrs, ...awayAbbrs]) {
            // Match abbreviation as whole word in channel name
            const regex = new RegExp(`\\b${abbr}\\b`, 'i');
            if (regex.test(channel.name)) { isMatch = true; break; }
        }

        if (!isMatch) {
            for (const kw of [...homeWords, ...awayWords]) {
                if (channelLower.includes(kw)) { isMatch = true; break; }
            }
        }

        if (isMatch) {
            const parsed = extractTeamInfo(channel.name);
            matchedStreams.push({
                stream_id: channel.id, channel_name: channel.name,
                feed: parsed.feed, provider: 'sphere'
            });
        }
    }

    return matchedStreams;
}

// ========================
// STATUS + BUILD RESPONSE
// ========================
function isLiveStatus(status) {
    const live = ['IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9',
        'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'EI', 'LIVE', 'IN PROGRESS', 'BT'];
    return live.includes(status?.toUpperCase());
}

function isFinishedStatus(status) {
    return ['FT', 'POST', 'AOT', 'CANC', 'SUSP', 'ABD'].includes(status?.toUpperCase());
}

function buildFixtureResponse(fixture, streams) {
    const status = fixture.status?.short || 'NS';
    const isLive = isLiveStatus(status);
    const isFinished = isFinishedStatus(status);
    const primaryStream = streams[0] || null;

    return {
        id: fixture.id,
        date: fixture.date,
        timestamp: fixture.timestamp,
        status: { short: status, long: fixture.status?.long || status },
        league: {
            id: fixture.league?.id, name: fixture.league?.name || 'MLB',
            logo: fixture.league?.logo, country: fixture.country?.name,
        },
        homeTeam: {
            id: fixture.teams?.home?.id, name: fixture.teams?.home?.name,
            logo: fixture.teams?.home?.logo,
        },
        awayTeam: {
            id: fixture.teams?.away?.id, name: fixture.teams?.away?.name,
            logo: fixture.teams?.away?.logo,
        },
        score: {
            home: fixture.scores?.home?.total ?? null,
            away: fixture.scores?.away?.total ?? null,
        },
        innings: {
            home: fixture.scores?.home?.innings || null,
            away: fixture.scores?.away?.innings || null,
        },
        isLive, isFinished,
        hasStream: !!primaryStream,
        stream: primaryStream ? {
            id: primaryStream.stream_id, provider: primaryStream.provider, feed: primaryStream.feed,
        } : null,
        allStreams: streams,
    };
}

// ========================
// ENDPOINTS
// ========================
async function getBaseballMatches(req, res) {
    try {
        const [fixtures, channels] = await Promise.all([
            fetchMLBFixtures(), fetchSphereChannels()
        ]);

        const matchedFixtures = fixtures.map(fixture => {
            const streams = findStreamForFixture(fixture, channels);
            return buildFixtureResponse(fixture, streams);
        });

        const live = matchedFixtures.filter(m => m.isLive);
        const upcoming = matchedFixtures.filter(m => !m.isLive && !m.isFinished);
        const finished = matchedFixtures.filter(m => m.isFinished);

        const matchedStreamIds = new Set();
        matchedFixtures.forEach(m => m.allStreams.forEach(s => matchedStreamIds.add(s.stream_id)));

        const extraChannels = channels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => { const p = extractTeamInfo(ch.name); return p.home && p.home.length > 1; })
            .map(ch => {
                const parsed = extractTeamInfo(ch.name);
                let cleanName = parsed.home;
                if (parsed.away) cleanName += ` vs ${parsed.away}`;
                return { id: ch.id, name: ch.name, cleanName, feed: parsed.feed, category: ch.category, provider: 'sphere' };
            });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                total: fixtures.length, live: live.length, upcoming: upcoming.length,
                finished: finished.length, withStreams: matchedFixtures.filter(m => m.hasStream).length,
                extraChannels: extraChannels.length, sphereChannels: channels.length,
            },
            matches: { live, upcoming, finished },
            extraChannels,
            sportsTVChannels: SPORTS_TV_CHANNELS.map(tv => ({ ...tv, provider: 'sphere' })),
        });

    } catch (error) {
        console.error('[Baseball] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getBaseballStreamInfo(req, res) {
    const { streamId } = req.params;

    try {
        const channels = await fetchSphereChannels();
        const channel = channels.find(ch => ch.id === parseInt(streamId));
        const streamUrl = `${VPS_STREAM_BASE}/hls/sphere_${streamId}.m3u8`;

        let matchData = null;
        if (channel) {
            const fixtures = await fetchMLBFixtures();
            for (const fixture of fixtures) {
                const streams = findStreamForFixture(fixture, [channel]);
                if (streams.length > 0) { matchData = buildFixtureResponse(fixture, streams); break; }
            }
        }

        res.json({
            success: true,
            stream: {
                id: parseInt(streamId), name: channel?.name || `MLB Stream ${streamId}`,
                url: streamUrl, category: channel?.category || 'MLB',
                icon: channel?.icon, league: 'MLB', provider: 'sphere',
            },
            match: matchData,
        });

    } catch (error) {
        console.error('[Baseball Stream] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getBaseballMatches, getBaseballStreamInfo };
