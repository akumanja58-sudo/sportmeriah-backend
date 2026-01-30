const axios = require('axios');

// API Sports configuration
const API_SPORTS_KEY = process.env.FOOTBALL_API_KEY;
const API_SPORTS_URL = 'https://v3.football.api-sports.io';

// IPTV configuration - SphereIPTV
const IPTV_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const IPTV_USER = process.env.IPTV_USER || '8297117';
const IPTV_PASS = process.env.IPTV_PASS || '4501185';
const IPTV_PROTOCOL = process.env.IPTV_PROTOCOL || 'https';

// Football IPTV Categories - SphereIPTV
const FOOTBALL_CATEGORIES = [
    { id: '171', name: 'SPORTS - SOCCER', priority: 1 },
];

// Popular leagues to fetch (to limit API calls)
const POPULAR_LEAGUES = [
    39,   // Premier League
    140,  // La Liga
    135,  // Serie A
    78,   // Bundesliga
    61,   // Ligue 1
    2,    // Champions League
    3,    // Europa League
    848,  // Conference League
    45,   // FA Cup
    48,   // League Cup
    143,  // Copa del Rey
    137,  // Coppa Italia
    529,  // Super Cup
    531,  // UEFA Super Cup
    253,  // MLS
    262,  // Liga MX
    94,   // Primeira Liga (Portugal)
    307,  // Saudi Pro League
];

// Team name variations for matching
const TEAM_ALIASES = {
    'manchester united': ['man united', 'man utd', 'manchester utd', 'mufc'],
    'manchester city': ['man city', 'mcfc'],
    'tottenham': ['tottenham hotspur', 'spurs'],
    'wolverhampton': ['wolves', 'wolverhampton wanderers'],
    'newcastle': ['newcastle united'],
    'brighton': ['brighton hove albion', 'brighton & hove albion'],
    'west ham': ['west ham united'],
    'nottingham forest': ["nott'm forest", 'nottm forest'],
    'atletico madrid': ['atletico', 'atlético madrid', 'atlético'],
    'real madrid': ['real'],
    'barcelona': ['barca', 'barça'],
    'bayern munich': ['bayern', 'bayern münchen'],
    'borussia dortmund': ['dortmund', 'bvb'],
    'psg': ['paris saint germain', 'paris saint-germain', 'paris sg'],
    'inter': ['inter milan', 'internazionale'],
    'ac milan': ['milan'],
    'rb leipzig': ['leipzig'],
    'deportivo alaves': ['deportivo alavés', 'alaves', 'alavés'],
    'vitoria guimaraes': ['vitória guimarães', 'guimaraes', 'guimarães'],
    'al nassr': ['al-nassr', 'nassr'],
    'pumas unam': ['pumas', 'unam'],
};

// Get all football matches with streams
const getFootballMatches = async (req, res) => {
    try {
        // Fetch both in parallel
        const [fixtures, iptvChannels] = await Promise.all([
            fetchFixtures(),
            fetchIPTVChannels()
        ]);

        // Match fixtures with IPTV channels
        const matchedFixtures = matchFixturesWithStreams(fixtures, iptvChannels);

        // Separate by status
        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        // Get unmatched IPTV channels (channels without fixture match)
        const matchedStreamIds = new Set(matchedFixtures.filter(m => m.stream).map(m => m.stream.id));
        const unmatchedChannels = iptvChannels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => hasTeamNames(ch.name)) // Only show channels with team names
            .slice(0, 50); // Limit unmatched

        res.json({
            success: true,
            sport: 'football',
            timestamp: new Date().toISOString(),
            stats: {
                total: matchedFixtures.length,
                live: liveMatches.length,
                upcoming: upcomingMatches.length,
                finished: finishedMatches.length,
                withStreams: matchedFixtures.filter(m => m.stream).length
            },
            matches: {
                live: liveMatches,
                upcoming: upcomingMatches,
                finished: finishedMatches.slice(0, 20) // Limit finished matches
            },
            extraChannels: unmatchedChannels // Channels that didn't match any fixture
        });

    } catch (error) {
        console.error('Football Matches Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch football matches',
            message: error.message
        });
    }
};

// Fetch fixtures from API Sports
const fetchFixtures = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Fetch today and tomorrow fixtures
        const [todayRes, tomorrowRes] = await Promise.all([
            axios.get(`${API_SPORTS_URL}/fixtures`, {
                headers: { 'x-apisports-key': API_SPORTS_KEY },
                params: { date: today },
                timeout: 15000
            }),
            axios.get(`${API_SPORTS_URL}/fixtures`, {
                headers: { 'x-apisports-key': API_SPORTS_KEY },
                params: { date: tomorrow },
                timeout: 15000
            })
        ]);

        const allFixtures = [
            ...(todayRes.data?.response || []),
            ...(tomorrowRes.data?.response || [])
        ];

        // Map to simplified format
        return allFixtures.map(f => ({
            id: f.fixture.id,
            date: f.fixture.date,
            timestamp: f.fixture.timestamp,
            status: mapStatus(f.fixture.status.short),
            statusDetail: f.fixture.status.long,
            elapsed: f.fixture.status.elapsed,
            league: {
                id: f.league.id,
                name: f.league.name,
                country: f.league.country,
                logo: f.league.logo
            },
            homeTeam: {
                id: f.teams.home.id,
                name: f.teams.home.name,
                logo: f.teams.home.logo
            },
            awayTeam: {
                id: f.teams.away.id,
                name: f.teams.away.name,
                logo: f.teams.away.logo
            },
            score: {
                home: f.goals.home,
                away: f.goals.away
            },
            venue: f.fixture.venue?.name || null
        }));

    } catch (error) {
        console.error('Error fetching fixtures:', error.message);
        return [];
    }
};

// Fetch IPTV channels - SphereIPTV
const fetchIPTVChannels = async () => {
    const allChannels = [];

    for (const category of FOOTBALL_CATEGORIES) {
        try {
            const response = await axios.get(`${IPTV_PROTOCOL}://${IPTV_SERVER}/player_api.php`, {
                params: {
                    username: IPTV_USER,
                    password: IPTV_PASS,
                    action: 'get_live_streams',
                    category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data
                    .filter(ch => !isExcludedChannel(ch.name))
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        icon: ch.stream_icon || null
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching IPTV category ${category.id}:`, err.message);
        }
    }

    // Remove duplicates
    const seen = new Set();
    return allChannels.filter(ch => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
    });
};

// Match fixtures with IPTV streams
const matchFixturesWithStreams = (fixtures, channels) => {
    return fixtures.map(fixture => {
        const stream = findMatchingChannel(fixture, channels);
        return {
            ...fixture,
            stream: stream ? {
                id: stream.id,
                name: stream.name,
                category: stream.category
            } : null,
            hasStream: !!stream
        };
    });
};

// Find matching channel for a fixture - Updated for SphereIPTV format
// Format: "USA Soccer01: Spain - La Liga : Espanyol vs Deportivo Alavés @ 03:00pm EST"
const findMatchingChannel = (fixture, channels) => {
    const homeTeam = normalizeTeamName(fixture.homeTeam.name);
    const awayTeam = normalizeTeamName(fixture.awayTeam.name);
    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);

    // Find channel that contains both team names
    for (const channel of channels) {
        const channelName = channel.name.toLowerCase();

        const hasHome = homeAliases.some(alias => channelName.includes(alias));
        const hasAway = awayAliases.some(alias => channelName.includes(alias));

        if (hasHome && hasAway) {
            return channel;
        }
    }

    // Try matching with just home team (some channels only show home team)
    for (const channel of channels) {
        const channelName = channel.name.toLowerCase();
        const hasHome = homeAliases.some(alias => channelName.includes(alias));

        if (hasHome && channelName.includes(' vs ')) {
            return channel;
        }
    }

    return null;
};

// Get single match by ID
const getFootballMatch = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch fixture details
        const fixtureRes = await axios.get(`${API_SPORTS_URL}/fixtures`, {
            headers: { 'x-apisports-key': API_SPORTS_KEY },
            params: { id },
            timeout: 15000
        });

        if (!fixtureRes.data?.response?.length) {
            return res.status(404).json({
                success: false,
                error: 'Match not found'
            });
        }

        const f = fixtureRes.data.response[0];
        const fixture = {
            id: f.fixture.id,
            date: f.fixture.date,
            timestamp: f.fixture.timestamp,
            status: mapStatus(f.fixture.status.short),
            statusDetail: f.fixture.status.long,
            elapsed: f.fixture.status.elapsed,
            league: {
                id: f.league.id,
                name: f.league.name,
                country: f.league.country,
                logo: f.league.logo
            },
            homeTeam: {
                id: f.teams.home.id,
                name: f.teams.home.name,
                logo: f.teams.home.logo
            },
            awayTeam: {
                id: f.teams.away.id,
                name: f.teams.away.name,
                logo: f.teams.away.logo
            },
            score: {
                home: f.goals.home,
                away: f.goals.away
            },
            venue: f.fixture.venue?.name || null
        };

        // Fetch IPTV channels and find match
        const channels = await fetchIPTVChannels();
        const stream = findMatchingChannel(fixture, channels);

        res.json({
            success: true,
            match: {
                ...fixture,
                stream: stream ? {
                    id: stream.id,
                    name: stream.name,
                    category: stream.category
                } : null,
                hasStream: !!stream
            }
        });

    } catch (error) {
        console.error('Football Match Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch match',
            message: error.message
        });
    }
};

// Get stream by ID (for direct channel access)
const getFootballStream = async (req, res) => {
    try {
        const { streamId } = req.params;
        const channels = await fetchIPTVChannels();
        const channel = channels.find(ch => String(ch.id) === String(streamId));

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Stream not found'
            });
        }

        res.json({
            success: true,
            stream: channel
        });

    } catch (error) {
        console.error('Football Stream Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stream',
            message: error.message
        });
    }
};

// Helper: Map API status to our status
const mapStatus = (status) => {
    const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
    const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
    const upcomingStatuses = ['TBD', 'NS', 'PST', 'SUSP', 'INT', 'CANC', 'ABD'];

    if (liveStatuses.includes(status)) return 'LIVE';
    if (finishedStatuses.includes(status)) return 'FINISHED';
    return 'UPCOMING';
};

// Helper: Normalize team name
const normalizeTeamName = (name) => {
    return name
        .toLowerCase()
        .replace(/fc|cf|sc|ac|as|ss|afc|ssc/gi, '')
        .replace(/[^a-z0-9\s]/gi, '')
        .trim();
};

// Helper: Get team aliases
const getTeamAliases = (teamName) => {
    const normalized = teamName.toLowerCase();
    const aliases = [normalized];

    // Check if team has known aliases
    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (normalized.includes(key) || values.some(v => normalized.includes(v))) {
            aliases.push(key, ...values);
        }
    }

    // Add common variations
    aliases.push(normalized.split(' ')[0]); // First word only

    return [...new Set(aliases)];
};

// Helper: Check if channel should be excluded
const isExcludedChannel = (name) => {
    if (!name) return true;
    const trimmedName = name.replace(/USA Soccer\d+:\s*/, '').trim();
    if (!trimmedName) return true; // Exclude empty channels like "USA Soccer08: "

    const upper = name.toUpperCase();
    const excludeKeywords = ['#####', '######', 'NO EVENT', 'OFF AIR', 'PLACEHOLDER'];
    return excludeKeywords.some(kw => upper.includes(kw));
};

// Helper: Check if channel name has team names (vs pattern)
const hasTeamNames = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower.includes(' vs ') || lower.includes(' v ');
};

module.exports = {
    getFootballMatches,
    getFootballMatch,
    getFootballStream
};
