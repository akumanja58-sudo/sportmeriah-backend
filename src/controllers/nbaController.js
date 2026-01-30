const axios = require('axios');

// API Sports configuration
const API_BASKETBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_BASKETBALL_URL = 'https://v1.basketball.api-sports.io';

// IPTV configuration - SphereIPTV
const IPTV_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const IPTV_USER = process.env.IPTV_USER || '8297117';
const IPTV_PASS = process.env.IPTV_PASS || '4501185';
const IPTV_PROTOCOL = process.env.IPTV_PROTOCOL || 'https';

// Basketball IPTV Categories - SphereIPTV
const BASKETBALL_CATEGORIES = [
    { id: '135', name: 'SPORTS - NBA', priority: 1 },
];

// NBA Team name variations for matching
const TEAM_ALIASES = {
    'los angeles lakers': ['lakers', 'la lakers', 'l.a. lakers', 'lal'],
    'los angeles clippers': ['clippers', 'la clippers', 'l.a. clippers', 'lac'],
    'golden state warriors': ['warriors', 'golden state', 'gsw'],
    'new york knicks': ['knicks', 'ny knicks', 'nyk'],
    'brooklyn nets': ['nets', 'brooklyn', 'bkn'],
    'boston celtics': ['celtics', 'boston', 'bos'],
    'miami heat': ['heat', 'miami', 'mia'],
    'chicago bulls': ['bulls', 'chicago', 'chi'],
    'philadelphia 76ers': ['76ers', 'sixers', 'philadelphia', 'philly', 'phi'],
    'toronto raptors': ['raptors', 'toronto', 'tor'],
    'san antonio spurs': ['spurs', 'san antonio', 'sas'],
    'dallas mavericks': ['mavericks', 'mavs', 'dallas', 'dal'],
    'houston rockets': ['rockets', 'houston', 'hou'],
    'denver nuggets': ['nuggets', 'denver', 'den'],
    'phoenix suns': ['suns', 'phoenix', 'phx'],
    'milwaukee bucks': ['bucks', 'milwaukee', 'mil'],
    'cleveland cavaliers': ['cavaliers', 'cavs', 'cleveland', 'cle'],
    'atlanta hawks': ['hawks', 'atlanta', 'atl'],
    'sacramento kings': ['kings', 'sacramento', 'sac'],
    'portland trail blazers': ['trail blazers', 'blazers', 'portland', 'por'],
    'oklahoma city thunder': ['thunder', 'okc', 'oklahoma city'],
    'minnesota timberwolves': ['timberwolves', 'wolves', 'minnesota', 'min'],
    'utah jazz': ['jazz', 'utah', 'uta'],
    'new orleans pelicans': ['pelicans', 'new orleans', 'nop'],
    'memphis grizzlies': ['grizzlies', 'memphis', 'mem'],
    'detroit pistons': ['pistons', 'detroit', 'det'],
    'indiana pacers': ['pacers', 'indiana', 'ind'],
    'orlando magic': ['magic', 'orlando', 'orl'],
    'charlotte hornets': ['hornets', 'charlotte', 'cha'],
    'washington wizards': ['wizards', 'washington', 'wsh', 'was'],
};

// Get all basketball matches with streams
const getBasketballMatches = async (req, res) => {
    try {
        // Fetch both in parallel
        const [fixtures, iptvChannels] = await Promise.all([
            fetchNBAFixtures(),
            fetchIPTVChannels()
        ]);

        // Match fixtures with IPTV channels
        const matchedFixtures = matchFixturesWithStreams(fixtures, iptvChannels);

        // Separate by status
        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        // Get unmatched IPTV channels
        const matchedStreamIds = new Set(matchedFixtures.filter(m => m.stream).map(m => m.stream.id));
        const unmatchedChannels = iptvChannels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => hasTeamNames(ch.name))
            .slice(0, 30);

        res.json({
            success: true,
            sport: 'basketball',
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
                finished: finishedMatches.slice(0, 20)
            },
            extraChannels: unmatchedChannels
        });

    } catch (error) {
        console.error('Basketball Matches Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch basketball matches',
            message: error.message
        });
    }
};

// Fetch NBA fixtures from API Sports
const fetchNBAFixtures = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // NBA League ID = 12
        const [todayRes, tomorrowRes] = await Promise.all([
            axios.get(`${API_BASKETBALL_URL}/games`, {
                headers: { 'x-apisports-key': API_BASKETBALL_KEY },
                params: { league: 12, season: '2024-2025', date: today },
                timeout: 15000
            }),
            axios.get(`${API_BASKETBALL_URL}/games`, {
                headers: { 'x-apisports-key': API_BASKETBALL_KEY },
                params: { league: 12, season: '2024-2025', date: tomorrow },
                timeout: 15000
            })
        ]);

        const allFixtures = [
            ...(todayRes.data?.response || []),
            ...(tomorrowRes.data?.response || [])
        ];

        // Map to simplified format
        return allFixtures.map(g => ({
            id: g.id,
            date: g.date,
            timestamp: new Date(g.date).getTime() / 1000,
            status: mapStatus(g.status.short),
            statusDetail: g.status.long,
            quarter: g.status.short,
            timer: g.status.timer,
            league: {
                id: g.league.id,
                name: g.league.name,
                logo: g.league.logo
            },
            homeTeam: {
                id: g.teams.home.id,
                name: g.teams.home.name,
                logo: g.teams.home.logo
            },
            awayTeam: {
                id: g.teams.away.id,
                name: g.teams.away.name,
                logo: g.teams.away.logo
            },
            score: {
                home: g.scores.home.total,
                away: g.scores.away.total
            },
            venue: g.venue || null
        }));

    } catch (error) {
        console.error('Error fetching NBA fixtures:', error.message);
        return [];
    }
};

// Fetch IPTV channels - SphereIPTV
const fetchIPTVChannels = async () => {
    const allChannels = [];

    for (const category of BASKETBALL_CATEGORIES) {
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

// Find matching channel for a fixture
// SphereIPTV format: "USA Real NBA 01: TOR Raptors VS ORL Magic ( ESPN Feed ) @ 7:30 PM"
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

    // Try matching with just one team + "vs" pattern
    for (const channel of channels) {
        const channelName = channel.name.toLowerCase();
        const hasHome = homeAliases.some(alias => channelName.includes(alias));

        if (hasHome && (channelName.includes(' vs ') || channelName.includes(' @ '))) {
            return channel;
        }
    }

    return null;
};

// Get single match by ID
const getBasketballMatch = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch fixture details
        const fixtureRes = await axios.get(`${API_BASKETBALL_URL}/games`, {
            headers: { 'x-apisports-key': API_BASKETBALL_KEY },
            params: { id },
            timeout: 15000
        });

        if (!fixtureRes.data?.response?.length) {
            return res.status(404).json({
                success: false,
                error: 'Match not found'
            });
        }

        const g = fixtureRes.data.response[0];
        const fixture = {
            id: g.id,
            date: g.date,
            timestamp: new Date(g.date).getTime() / 1000,
            status: mapStatus(g.status.short),
            statusDetail: g.status.long,
            quarter: g.status.short,
            timer: g.status.timer,
            league: {
                id: g.league.id,
                name: g.league.name,
                logo: g.league.logo
            },
            homeTeam: {
                id: g.teams.home.id,
                name: g.teams.home.name,
                logo: g.teams.home.logo
            },
            awayTeam: {
                id: g.teams.away.id,
                name: g.teams.away.name,
                logo: g.teams.away.logo
            },
            score: {
                home: g.scores.home.total,
                away: g.scores.away.total
            },
            venue: g.venue || null
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
        console.error('Basketball Match Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch match',
            message: error.message
        });
    }
};

// Get stream by ID (for direct channel access)
const getBasketballStream = async (req, res) => {
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
        console.error('Basketball Stream Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stream',
            message: error.message
        });
    }
};

// Helper: Map API status to our status
const mapStatus = (status) => {
    const liveStatuses = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'BT'];
    const finishedStatuses = ['FT', 'AOT', 'POST'];

    if (liveStatuses.includes(status)) return 'LIVE';
    if (finishedStatuses.includes(status)) return 'FINISHED';
    return 'UPCOMING';
};

// Helper: Normalize team name
const normalizeTeamName = (name) => {
    return name
        .toLowerCase()
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

    // Add last word (usually the team nickname like "Lakers", "Celtics")
    const words = normalized.split(' ');
    if (words.length > 1) {
        aliases.push(words[words.length - 1]);
    }

    return [...new Set(aliases)];
};

// Helper: Check if channel should be excluded
const isExcludedChannel = (name) => {
    if (!name) return true;

    // Exclude empty channels like "USA Real NBA 10: "
    const trimmedName = name.replace(/USA Real NBA \d+:\s*/, '').trim();
    if (!trimmedName) return true;

    const upper = name.toUpperCase();
    const excludeKeywords = ['#####', '######', 'NO EVENT', 'OFF AIR', 'PLACEHOLDER'];
    return excludeKeywords.some(kw => upper.includes(kw));
};

// Helper: Check if channel name has team names
const hasTeamNames = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower.includes(' vs ') || lower.includes(' @ ') || lower.includes(' v ');
};

module.exports = {
    getBasketballMatches,
    getBasketballMatch,
    getBasketballStream
};
