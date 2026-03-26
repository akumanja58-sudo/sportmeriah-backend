const axios = require('axios');

// ========================
// CONFIG
// ========================
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || '1fc6485365cd4c504dc63f172a37838b';
const HOCKEY_API_BASE = 'https://v1.hockey.api-sports.io';
const NHL_LEAGUE_ID = 57;

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

// Sphere categories for Hockey
const HOCKEY_CATEGORIES = [
    { id: '137', name: 'USA NHL' },
    { id: '393', name: 'CANADIAN HOCKEY' },
];

const SPORTS_TV_CHANNELS = [
    { stream_id: 3636, name: 'ESPN UHD', league: 'NHL' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'NHL' },
    { stream_id: 3725, name: 'ESPN (SHD)', league: 'NHL' },
    { stream_id: 2581, name: 'ESPN 2 (SHD)', league: 'NHL' },
];

// ========================
// NHL TEAM ABBREVIATIONS → Full Names
// ========================
const NHL_TEAMS = {
    // Atlantic
    'BOS': 'Boston Bruins', 'BUF': 'Buffalo Sabres', 'DET': 'Detroit Red Wings',
    'FLA': 'Florida Panthers', 'MTL': 'Montreal Canadiens', 'OTT': 'Ottawa Senators',
    'TBL': 'Tampa Bay Lightning', 'TB': 'Tampa Bay Lightning', 'TOR': 'Toronto Maple Leafs',
    // Metropolitan
    'CAR': 'Carolina Hurricanes', 'CBJ': 'Columbus Blue Jackets', 'NJD': 'New Jersey Devils',
    'NJ': 'New Jersey Devils', 'NYI': 'New York Islanders', 'NYR': 'New York Rangers',
    'PHI': 'Philadelphia Flyers', 'PIT': 'Pittsburgh Penguins', 'WSH': 'Washington Capitals',
    'WAS': 'Washington Capitals',
    // Central
    'ARI': 'Arizona Coyotes', 'UTA': 'Utah Hockey Club', 'CHI': 'Chicago Blackhawks',
    'COL': 'Colorado Avalanche', 'DAL': 'Dallas Stars', 'MIN': 'Minnesota Wild',
    'NSH': 'Nashville Predators', 'STL': 'St. Louis Blues', 'WPG': 'Winnipeg Jets',
    // Pacific
    'ANA': 'Anaheim Ducks', 'CGY': 'Calgary Flames', 'EDM': 'Edmonton Oilers',
    'LAK': 'Los Angeles Kings', 'LA': 'Los Angeles Kings', 'SJS': 'San Jose Sharks',
    'SJ': 'San Jose Sharks', 'SEA': 'Seattle Kraken', 'VAN': 'Vancouver Canucks',
    'VGK': 'Vegas Golden Knights', 'VGS': 'Vegas Golden Knights',
};

// Reverse map: full name → abbreviations
const NAME_TO_ABBR = {};
Object.entries(NHL_TEAMS).forEach(([abbr, name]) => {
    if (!NAME_TO_ABBR[name.toLowerCase()]) NAME_TO_ABBR[name.toLowerCase()] = [];
    NAME_TO_ABBR[name.toLowerCase()].push(abbr);
});

// ========================
// CACHE
// ========================
let fixturesCache = { data: null, lastFetch: null, ttl: 2 * 60 * 1000 }; // 2 min
let sphereCache = { data: null, lastFetch: null, ttl: 5 * 60 * 1000 }; // 5 min

// ========================
// FETCH NHL FIXTURES (API-Sports)
// ========================
async function fetchNHLFixtures() {
    const now = Date.now();
    if (fixturesCache.data && fixturesCache.lastFetch && (now - fixturesCache.lastFetch < fixturesCache.ttl)) {
        return fixturesCache.data;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get(`${HOCKEY_API_BASE}/games`, {
            headers: { 'x-apisports-key': API_SPORTS_KEY },
            params: { league: NHL_LEAGUE_ID, date: today, season: 2025 },
            timeout: 10000
        });

        if (response.data?.response) {
            fixturesCache.data = response.data.response;
            fixturesCache.lastFetch = now;
            console.log(`[Hockey API] Fetched ${response.data.response.length} NHL games for ${today}`);
            return response.data.response;
        }
        return [];
    } catch (err) {
        console.error('[Hockey API] Error:', err.message);
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

    for (const category of HOCKEY_CATEGORIES) {
        try {
            const response = await axios.get(`${acc.protocol}://${acc.server}:${acc.port}/player_api.php`, {
                params: {
                    username: acc.user,
                    password: acc.pass,
                    action: 'get_live_streams',
                    category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data
                    .filter(ch => ch.name && !/test|backup|offline/i.test(ch.name))
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        icon: ch.stream_icon || null,
                        provider: 'sphere'
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`[Sphere] Error fetching hockey cat ${category.id}:`, err.message);
        }
    }

    // Deduplicate
    const seen = new Set();
    const unique = allChannels.filter(ch => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
    });

    if (acc === PRIMARY) {
        sphereCache.data = unique;
        sphereCache.lastFetch = now;
    }

    console.log(`[Sphere] Fetched ${unique.length} hockey channels`);
    return unique;
}

// ========================
// MATCH FIXTURES WITH SPHERE CHANNELS
// ========================
function extractTeamAbbr(channelName) {
    if (!channelName) return { home: null, away: null, feed: null };

    // Pattern: "USA Real NHL 01: CBJ vs MTL (RDS Feed)"
    // or "USA Real NHL 01: CBJ" (single team channel)
    let clean = channelName;

    // Remove common prefixes
    clean = clean.replace(/^USA\s*(Real\s*)?NHL\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^CANADIAN\s*HOCKEY\s*\d*\s*:\s*/i, '');
    clean = clean.replace(/^NHL\s*\d*\s*:\s*/i, '');

    // Extract feed info
    let feed = null;
    const feedMatch = clean.match(/\(([^)]+)\)/);
    if (feedMatch) {
        feed = feedMatch[1].trim();
        clean = clean.replace(/\([^)]*\)/, '').trim();
    }

    // Remove time suffix
    clean = clean.replace(/\s*@\s*[\d:]+\s*(AM|PM)?.*$/i, '').trim();

    // Try "TEAM vs TEAM" pattern
    const vsMatch = clean.match(/^(\w{2,4})\s+(?:vs\.?|@)\s+(\w{2,4})/i);
    if (vsMatch) {
        return { home: vsMatch[1].toUpperCase(), away: vsMatch[2].toUpperCase(), feed };
    }

    // Single team channel: just "CBJ" or "Chicago Blackhawks"
    const singleAbbr = clean.trim().toUpperCase();
    if (NHL_TEAMS[singleAbbr]) {
        return { home: singleAbbr, away: null, feed };
    }

    return { home: null, away: null, feed };
}

function findStreamForFixture(fixture, channels) {
    const homeTeam = fixture.teams?.home?.name?.toLowerCase() || '';
    const awayTeam = fixture.teams?.away?.name?.toLowerCase() || '';

    // Get all possible abbreviations for home and away teams
    const homeAbbrs = NAME_TO_ABBR[homeTeam] || [];
    const awayAbbrs = NAME_TO_ABBR[awayTeam] || [];

    // Also try partial matching (e.g., "Bruins" in "Boston Bruins")
    const homeKeywords = homeTeam.split(' ').filter(w => w.length > 3);
    const awayKeywords = awayTeam.split(' ').filter(w => w.length > 3);

    const matchedStreams = [];

    for (const channel of channels) {
        const parsed = extractTeamAbbr(channel.name);
        if (!parsed.home) continue;

        let isMatch = false;

        // Check abbreviation match
        if (homeAbbrs.includes(parsed.home) || awayAbbrs.includes(parsed.home)) {
            isMatch = true;
        }
        if (parsed.away && (homeAbbrs.includes(parsed.away) || awayAbbrs.includes(parsed.away))) {
            isMatch = true;
        }

        // Check keyword match in channel name
        if (!isMatch) {
            const channelLower = channel.name.toLowerCase();
            for (const kw of homeKeywords) {
                if (channelLower.includes(kw)) { isMatch = true; break; }
            }
            if (!isMatch) {
                for (const kw of awayKeywords) {
                    if (channelLower.includes(kw)) { isMatch = true; break; }
                }
            }
        }

        if (isMatch) {
            matchedStreams.push({
                stream_id: channel.id,
                channel_name: channel.name,
                feed: parsed.feed,
                provider: 'sphere'
            });
        }
    }

    return matchedStreams;
}

// ========================
// STATUS HELPERS
// ========================
function isLiveStatus(status) {
    const liveStatuses = ['1P', '2P', '3P', 'OT', 'P1', 'P2', 'P3', 'BT', 'LIVE', 'IN PROGRESS'];
    return liveStatuses.includes(status?.toUpperCase());
}

function isFinishedStatus(status) {
    const finishedStatuses = ['FT', 'AOT', 'AP', 'POST'];
    return finishedStatuses.includes(status?.toUpperCase());
}

// ========================
// BUILD RESPONSE
// ========================
function buildFixtureResponse(fixture, streams) {
    const status = fixture.status?.short || 'NS';
    const isLive = isLiveStatus(status);
    const isFinished = isFinishedStatus(status);

    const primaryStream = streams[0] || null;

    return {
        id: fixture.id,
        date: fixture.date,
        timestamp: fixture.timestamp,
        status: {
            short: status,
            long: fixture.status?.long || status,
        },
        league: {
            id: fixture.league?.id,
            name: fixture.league?.name || 'NHL',
            logo: fixture.league?.logo,
            country: fixture.country?.name,
        },
        homeTeam: {
            id: fixture.teams?.home?.id,
            name: fixture.teams?.home?.name,
            logo: fixture.teams?.home?.logo,
        },
        awayTeam: {
            id: fixture.teams?.away?.id,
            name: fixture.teams?.away?.name,
            logo: fixture.teams?.away?.logo,
        },
        score: {
            home: fixture.scores?.home,
            away: fixture.scores?.away,
        },
        periods: fixture.periods || null,
        isLive,
        isFinished,
        hasStream: !!primaryStream,
        stream: primaryStream ? {
            id: primaryStream.stream_id,
            provider: primaryStream.provider,
            feed: primaryStream.feed,
        } : null,
        allStreams: streams,
    };
}

// ========================
// ENDPOINTS
// ========================

// GET /api/hockey
async function getHockeyMatches(req, res) {
    try {
        const [fixtures, channels] = await Promise.all([
            fetchNHLFixtures(),
            fetchSphereChannels()
        ]);

        // Match fixtures with streams
        const matchedFixtures = fixtures.map(fixture => {
            const streams = findStreamForFixture(fixture, channels);
            return buildFixtureResponse(fixture, streams);
        });

        // Separate by status
        const live = matchedFixtures.filter(m => m.isLive);
        const upcoming = matchedFixtures.filter(m => !m.isLive && !m.isFinished);
        const finished = matchedFixtures.filter(m => m.isFinished);

        // Find unmatched channels (extra channels)
        const matchedStreamIds = new Set();
        matchedFixtures.forEach(m => {
            m.allStreams.forEach(s => matchedStreamIds.add(s.stream_id));
        });

        const extraChannels = channels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => {
                // Only include non-empty channels
                const parsed = extractTeamAbbr(ch.name);
                return parsed.home !== null;
            })
            .map(ch => {
                const parsed = extractTeamAbbr(ch.name);
                return {
                    id: ch.id,
                    name: ch.name,
                    cleanName: parsed.home ? (NHL_TEAMS[parsed.home] || parsed.home) + (parsed.away ? ` vs ${NHL_TEAMS[parsed.away] || parsed.away}` : '') : ch.name,
                    feed: parsed.feed,
                    category: ch.category,
                    provider: 'sphere',
                };
            });

        // Sports TV channels
        const sportsTVChannels = SPORTS_TV_CHANNELS.map(tv => ({
            ...tv,
            provider: 'sphere'
        }));

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                total: fixtures.length,
                live: live.length,
                upcoming: upcoming.length,
                finished: finished.length,
                withStreams: matchedFixtures.filter(m => m.hasStream).length,
                extraChannels: extraChannels.length,
                sphereChannels: channels.length,
            },
            matches: {
                live,
                upcoming,
                finished,
            },
            extraChannels,
            sportsTVChannels,
        });

    } catch (error) {
        console.error('[Hockey] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/hockey/stream/:streamId
async function getHockeyStreamInfo(req, res) {
    const { streamId } = req.params;

    try {
        const channels = await fetchSphereChannels();
        const channel = channels.find(ch => ch.id === parseInt(streamId));

        const streamUrl = `${VPS_STREAM_BASE}/hls/sphere_${streamId}.m3u8`;

        // Try to find matching fixture for this channel
        let matchData = null;
        if (channel) {
            const fixtures = await fetchNHLFixtures();
            for (const fixture of fixtures) {
                const streams = findStreamForFixture(fixture, [channel]);
                if (streams.length > 0) {
                    matchData = buildFixtureResponse(fixture, streams);
                    break;
                }
            }
        }

        res.json({
            success: true,
            stream: {
                id: parseInt(streamId),
                name: channel?.name || `Hockey Stream ${streamId}`,
                url: streamUrl,
                category: channel?.category || 'NHL',
                icon: channel?.icon,
                league: 'NHL',
                provider: 'sphere',
            },
            match: matchData,
        });

    } catch (error) {
        console.error('[Hockey Stream] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    getHockeyMatches,
    getHockeyStreamInfo,
};
