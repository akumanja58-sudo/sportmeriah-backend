const axios = require('axios');

const API_SPORTS_KEY = process.env.API_SPORTS_KEY || '1fc6485365cd4c504dc63f172a37838b';
const NFL_API_BASE = 'https://v1.american-football.api-sports.io';
const NFL_LEAGUE_ID = 1;

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

const NFL_CATEGORIES = [
    { id: '134', name: 'USA NFL' },
    { id: '181', name: 'NCAA FOOTBALL' },
];

const SPORTS_TV_CHANNELS = [
    { stream_id: 3636, name: 'ESPN UHD', league: 'NFL' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'NFL' },
    { stream_id: 3645, name: 'Fox Sports 1 UHD', league: 'NFL' },
    { stream_id: 3621, name: 'CBS Sports Network UHD', league: 'NFL' },
];

// NFL Teams
const NFL_TEAMS = {
    // AFC East
    'BUF': 'Buffalo Bills', 'MIA': 'Miami Dolphins', 'NE': 'New England Patriots',
    'NEP': 'New England Patriots', 'NYJ': 'New York Jets',
    // AFC North
    'BAL': 'Baltimore Ravens', 'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns',
    'PIT': 'Pittsburgh Steelers',
    // AFC South
    'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAX': 'Jacksonville Jaguars',
    'JAC': 'Jacksonville Jaguars', 'TEN': 'Tennessee Titans',
    // AFC West
    'DEN': 'Denver Broncos', 'KC': 'Kansas City Chiefs', 'KCC': 'Kansas City Chiefs',
    'LV': 'Las Vegas Raiders', 'LAC': 'Los Angeles Chargers',
    // NFC East
    'DAL': 'Dallas Cowboys', 'NYG': 'New York Giants', 'PHI': 'Philadelphia Eagles',
    'WAS': 'Washington Commanders', 'WSH': 'Washington Commanders',
    // NFC North
    'CHI': 'Chicago Bears', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers',
    'GBP': 'Green Bay Packers', 'MIN': 'Minnesota Vikings',
    // NFC South
    'ATL': 'Atlanta Falcons', 'CAR': 'Carolina Panthers', 'NO': 'New Orleans Saints',
    'NOS': 'New Orleans Saints', 'TB': 'Tampa Bay Buccaneers', 'TBB': 'Tampa Bay Buccaneers',
    // NFC West
    'ARI': 'Arizona Cardinals', 'LAR': 'Los Angeles Rams', 'SF': 'San Francisco 49ers',
    'SFO': 'San Francisco 49ers', 'SEA': 'Seattle Seahawks',
};

const NAME_TO_ABBR = {};
Object.entries(NFL_TEAMS).forEach(([abbr, name]) => {
    if (!NAME_TO_ABBR[name.toLowerCase()]) NAME_TO_ABBR[name.toLowerCase()] = [];
    NAME_TO_ABBR[name.toLowerCase()].push(abbr);
});

// ========================
// CACHE
// ========================
let fixturesCache = { data: null, lastFetch: null, ttl: 2 * 60 * 1000 };
let sphereCache = { data: null, lastFetch: null, ttl: 5 * 60 * 1000 };

// ========================
// FETCH NFL FIXTURES
// ========================
async function fetchNFLFixtures() {
    const now = Date.now();
    if (fixturesCache.data && fixturesCache.lastFetch && (now - fixturesCache.lastFetch < fixturesCache.ttl)) {
        return fixturesCache.data;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        // Try current year season first, fallback to previous year
        const currentYear = new Date().getFullYear();
        const month = new Date().getMonth(); // 0-indexed
        // NFL season runs Aug-Feb, so if Jan-Jul use previous year season
        const season = month <= 6 ? currentYear - 1 : currentYear;

        const response = await axios.get(`${NFL_API_BASE}/games`, {
            headers: { 'x-apisports-key': API_SPORTS_KEY },
            params: { league: NFL_LEAGUE_ID, date: today, season: season },
            timeout: 10000
        });

        if (response.data?.response) {
            fixturesCache.data = response.data.response;
            fixturesCache.lastFetch = now;
            console.log(`[NFL API] Fetched ${response.data.response.length} NFL games for ${today} (season ${season})`);
            return response.data.response;
        }
        return [];
    } catch (err) {
        console.error('[NFL API] Error:', err.message);
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

    for (const category of NFL_CATEGORIES) {
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
            console.error(`[Sphere] Error fetching NFL cat ${category.id}:`, err.message);
        }
    }

    const seen = new Set();
    const unique = allChannels.filter(ch => { if (seen.has(ch.id)) return false; seen.add(ch.id); return true; });

    if (acc === PRIMARY) { sphereCache.data = unique; sphereCache.lastFetch = now; }
    console.log(`[Sphere] Fetched ${unique.length} NFL channels`);
    return unique;
}

// ========================
// CHANNEL PARSING + MATCHING
// ========================
function extractTeamInfo(channelName) {
    if (!channelName) return { home: null, away: null, feed: null };

    let clean = channelName;
    // Remove prefixes
    clean = clean.replace(/^USA\s*(Real\s*)?NFL\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^NFL\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^USA\s*NCAAF?\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^SNF\s*(\([^)]*\))?\s*:?\s*/i, '');
    clean = clean.replace(/^MNF\s*:?\s*/i, '');
    clean = clean.replace(/^TNF\s*:?\s*/i, '');

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
    // NFL API structure: fixture.teams.home/away
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
// STATUS + BUILD
// ========================
function isLiveStatus(status) {
    const live = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE', 'IN PROGRESS', 'BT'];
    return live.includes(status?.toUpperCase());
}

function isFinishedStatus(status) {
    return ['FT', 'AOT', 'POST', 'CANC', 'SUSP', 'ABD'].includes(status?.toUpperCase());
}

function buildFixtureResponse(fixture, streams) {
    // NFL API wraps in game object
    const game = fixture.game || fixture;
    const status = game.status?.short || 'NS';
    const isLive = isLiveStatus(status);
    const isFinished = isFinishedStatus(status);
    const primaryStream = streams[0] || null;

    return {
        id: game.id,
        date: game.date?.date ? `${game.date.date}T${game.date.time || '00:00'}:00+00:00` : fixture.date,
        timestamp: game.date?.timestamp || fixture.timestamp,
        status: { short: status, long: game.status?.long || status },
        stage: game.stage || null,
        week: game.week || null,
        venue: game.venue || null,
        league: {
            id: fixture.league?.id, name: fixture.league?.name || 'NFL',
            logo: fixture.league?.logo, country: fixture.league?.country?.name,
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
        quarters: {
            home: {
                q1: fixture.scores?.home?.quarter_1, q2: fixture.scores?.home?.quarter_2,
                q3: fixture.scores?.home?.quarter_3, q4: fixture.scores?.home?.quarter_4,
                ot: fixture.scores?.home?.overtime,
            },
            away: {
                q1: fixture.scores?.away?.quarter_1, q2: fixture.scores?.away?.quarter_2,
                q3: fixture.scores?.away?.quarter_3, q4: fixture.scores?.away?.quarter_4,
                ot: fixture.scores?.away?.overtime,
            },
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
async function getNFLMatches(req, res) {
    try {
        const [fixtures, channels] = await Promise.all([
            fetchNFLFixtures(), fetchSphereChannels()
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
        console.error('[NFL] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getNFLStreamInfo(req, res) {
    const { streamId } = req.params;

    try {
        const channels = await fetchSphereChannels();
        const channel = channels.find(ch => ch.id === parseInt(streamId));
        const streamUrl = `${VPS_STREAM_BASE}/hls/sphere_${streamId}.m3u8`;

        let matchData = null;
        if (channel) {
            const fixtures = await fetchNFLFixtures();
            for (const fixture of fixtures) {
                const streams = findStreamForFixture(fixture, [channel]);
                if (streams.length > 0) { matchData = buildFixtureResponse(fixture, streams); break; }
            }
        }

        res.json({
            success: true,
            stream: {
                id: parseInt(streamId), name: channel?.name || `NFL Stream ${streamId}`,
                url: streamUrl, category: channel?.category || 'NFL',
                icon: channel?.icon, league: 'NFL', provider: 'sphere',
            },
            match: matchData,
        });

    } catch (error) {
        console.error('[NFL Stream] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getNFLMatches, getNFLStreamInfo };
