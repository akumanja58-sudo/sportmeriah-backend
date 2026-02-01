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

// Sports TV Category (Category 122) - Premium Sports Channels
const SPORTS_TV_CATEGORY = '122';

// Sports TV channels we want to feature for Football
const FOOTBALL_TV_CHANNELS = [
    // Premier League / EPL
    { stream_id: 660938, name: 'Premier League TV', sport: 'football', league: 'Premier League' },

    // beIN Sports (La Liga, Ligue 1, etc)
    { stream_id: 3612, name: 'beIN Sports UHD', sport: 'football', league: 'Multi-League' },
    { stream_id: 3613, name: 'beIN Sports en Espanol UHD', sport: 'football', league: 'La Liga' },
    { stream_id: 5313, name: 'beIN Sports 4', sport: 'football', league: 'Multi-League' },
    { stream_id: 5312, name: 'beIN Sports 5', sport: 'football', league: 'Multi-League' },
    { stream_id: 5311, name: 'beIN Sports 6', sport: 'football', league: 'Multi-League' },
    { stream_id: 5310, name: 'beIN Sports 7', sport: 'football', league: 'Multi-League' },
    { stream_id: 5309, name: 'beIN Sports 8', sport: 'football', league: 'Multi-League' },
    { stream_id: 90427, name: 'beIN Sports La Liga', sport: 'football', league: 'La Liga' },
    { stream_id: 434356, name: 'beIN Sports Xtra', sport: 'football', league: 'Multi-League' },

    // ESPN (EPL, UCL, etc)
    { stream_id: 3636, name: 'ESPN UHD', sport: 'football', league: 'Multi-League' },
    { stream_id: 3637, name: 'ESPN 2 UHD', sport: 'football', league: 'Multi-League' },
    { stream_id: 3725, name: 'ESPN (SHD)', sport: 'football', league: 'Multi-League' },
    { stream_id: 2581, name: 'ESPN 2 (SHD)', sport: 'football', league: 'Multi-League' },
    { stream_id: 2578, name: 'ESPN Deportes (SHD)', sport: 'football', league: 'La Liga' },

    // Fox Sports
    { stream_id: 3645, name: 'Fox Sports 1 UHD', sport: 'football', league: 'Multi-League' },
    { stream_id: 3646, name: 'Fox Sports 2 UHD', sport: 'football', league: 'Multi-League' },
    { stream_id: 2501, name: 'Fox Sports 1 (SHD)', sport: 'football', league: 'Multi-League' },
    { stream_id: 2500, name: 'Fox Sports 2', sport: 'football', league: 'Multi-League' },
    { stream_id: 2531, name: 'Fox Soccer Plus', sport: 'football', league: 'Multi-League' },
    { stream_id: 3800, name: 'Fox Soccer Plus LHD', sport: 'football', league: 'Multi-League' },
    { stream_id: 2559, name: 'Fox Deportes (SHD)', sport: 'football', league: 'Liga MX' },

    // CBS Sports
    { stream_id: 3621, name: 'CBS Sports Network UHD', sport: 'football', league: 'UCL/UEL' },
    { stream_id: 3712, name: 'CBS Sports Network (SHD)', sport: 'football', league: 'UCL/UEL' },
    { stream_id: 660925, name: 'CBS Sports Golazo Network', sport: 'football', league: 'UCL/UEL' },

    // Other Sports
    { stream_id: 3810, name: 'Eleven Sports', sport: 'football', league: 'Multi-League' },
    { stream_id: 50908, name: 'Fubo Sports Network', sport: 'football', league: 'Multi-League' },
    { stream_id: 4445, name: 'TyC Sports', sport: 'football', league: 'Argentina' },
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
        // Fetch fixtures, IPTV channels, and Sports TV channels in parallel
        const [fixtures, iptvChannels, sportsTVChannels] = await Promise.all([
            fetchFixtures(),
            fetchIPTVChannels(),
            fetchSportsTVChannels()
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
                withStreams: matchedFixtures.filter(m => m.stream).length,
                sportsTVChannels: sportsTVChannels.length
            },
            matches: {
                live: liveMatches,
                upcoming: upcomingMatches,
                finished: finishedMatches.slice(0, 20) // Limit finished matches
            },
            extraChannels: unmatchedChannels, // Channels that didn't match any fixture
            sportsTVChannels: sportsTVChannels // NEW: Premium Sports TV channels
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

// NEW: Fetch Sports TV channels from Category 122
const fetchSportsTVChannels = async () => {
    try {
        const response = await axios.get(`${IPTV_PROTOCOL}://${IPTV_SERVER}/player_api.php`, {
            params: {
                username: IPTV_USER,
                password: IPTV_PASS,
                action: 'get_live_streams',
                category_id: SPORTS_TV_CATEGORY
            },
            timeout: 10000
        });

        if (response.data && Array.isArray(response.data)) {
            // Filter to only get our predefined football channels
            const footballStreamIds = new Set(FOOTBALL_TV_CHANNELS.map(ch => ch.stream_id));

            const channels = response.data
                .filter(ch => footballStreamIds.has(ch.stream_id))
                .map(ch => {
                    // Find our predefined channel info
                    const predefined = FOOTBALL_TV_CHANNELS.find(p => p.stream_id === ch.stream_id);
                    return {
                        id: ch.stream_id,
                        name: predefined?.name || ch.name,
                        originalName: ch.name,
                        icon: ch.stream_icon || null,
                        league: predefined?.league || 'Sports',
                        category: 'Sports TV',
                        type: 'tv_channel'
                    };
                });

            // Sort by predefined order
            const orderMap = new Map(FOOTBALL_TV_CHANNELS.map((ch, idx) => [ch.stream_id, idx]));
            channels.sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));

            return channels;
        }

        return [];
    } catch (err) {
        console.error('Error fetching Sports TV channels:', err.message);
        return [];
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

        // STRICT: Must have BOTH teams for a match
        if (hasHome && hasAway) {
            return channel;
        }
    }

    return null;
};

// Normalize team name for comparison
const normalizeTeamName = (name) => {
    return name
        .toLowerCase()
        .replace(/fc|cf|sc|ac|as|ss|us|rc|cd|ud|rcd|sd|ca|ce|real|racing|deportivo|atletico|atlético|sporting/gi, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// Get all aliases for a team
const getTeamAliases = (normalizedName) => {
    const aliases = [normalizedName];

    // Check if team has predefined aliases
    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (normalizedName.includes(key) || values.some(v => normalizedName.includes(v))) {
            aliases.push(key, ...values);
        }
    }

    return [...new Set(aliases)];
};

// Check if channel name contains team names
const hasTeamNames = (channelName) => {
    // Pattern: "Team1 vs Team2" or "Team1 VS Team2"
    return /\bvs\b/i.test(channelName);
};

// Exclude certain channels
const isExcludedChannel = (name) => {
    const excludePatterns = [
        /test/i,
        /backup/i,
        /offline/i,
        /\[.*\]/,
    ];
    return excludePatterns.some(pattern => pattern.test(name));
};

// Map API status to our status
const mapStatus = (status) => {
    const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
    const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

    if (liveStatuses.includes(status)) return 'LIVE';
    if (finishedStatuses.includes(status)) return 'FINISHED';
    return 'UPCOMING';
};

// Get single stream info
const getStreamInfo = async (req, res) => {
    try {
        const { streamId } = req.params;

        // Fetch all IPTV channels to find this stream
        const [iptvChannels, sportsTVChannels] = await Promise.all([
            fetchIPTVChannels(),
            fetchSportsTVChannels()
        ]);

        // Combine all channels
        const allChannels = [...iptvChannels, ...sportsTVChannels];
        const channel = allChannels.find(ch => ch.id === parseInt(streamId));

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Stream not found'
            });
        }

        // Build stream URL
        const streamUrl = `${IPTV_PROTOCOL}://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${streamId}.m3u8`;

        // Try to find matching fixture
        const fixtures = await fetchFixtures();
        const match = findMatchingFixture(channel.name, fixtures);

        // Parse team names from channel name
        const parsedInfo = parseChannelName(channel.name);

        res.json({
            success: true,
            stream: {
                id: channel.id,
                name: channel.name,
                url: streamUrl,
                category: channel.category,
                icon: channel.icon,
                league: channel.league || null,
                type: channel.type || 'match'
            },
            match: match,
            parsedInfo: parsedInfo
        });

    } catch (error) {
        console.error('Stream Info Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stream info',
            message: error.message
        });
    }
};

// Find matching fixture for a channel
const findMatchingFixture = (channelName, fixtures) => {
    const name = channelName.toLowerCase();

    for (const fixture of fixtures) {
        const homeAliases = getTeamAliases(normalizeTeamName(fixture.homeTeam.name));
        const awayAliases = getTeamAliases(normalizeTeamName(fixture.awayTeam.name));

        const hasHome = homeAliases.some(alias => name.includes(alias));
        const hasAway = awayAliases.some(alias => name.includes(alias));

        if (hasHome && hasAway) {
            return fixture;
        }
    }

    return null;
};

// Parse channel name to extract info
// Format: "USA Soccer01: Spain - La Liga : Espanyol vs Deportivo Alavés @ 03:00pm EST"
const parseChannelName = (channelName) => {
    // Try to extract "Team1 vs Team2"
    const vsMatch = channelName.match(/([^:]+)\s+vs\s+([^@]+)/i);

    if (vsMatch) {
        let homeTeam = vsMatch[1].trim();
        let awayTeam = vsMatch[2].trim();

        // Clean up team names - remove league prefix if present
        homeTeam = homeTeam.replace(/^.*?:\s*/, '').trim();
        awayTeam = awayTeam.replace(/@.*$/, '').trim();

        // Try to extract league from channel name
        const leagueMatch = channelName.match(/:\s*([^:]+?)\s*:\s*[^:]+vs/i);
        const league = leagueMatch ? leagueMatch[1].trim() : null;

        return {
            homeTeam,
            awayTeam,
            league,
            raw: channelName
        };
    }

    return {
        homeTeam: null,
        awayTeam: null,
        league: null,
        raw: channelName
    };
};

// NEW: Get Sports TV channels only
const getSportsTVChannels = async (req, res) => {
    try {
        const channels = await fetchSportsTVChannels();

        res.json({
            success: true,
            sport: 'football',
            timestamp: new Date().toISOString(),
            count: channels.length,
            channels: channels
        });

    } catch (error) {
        console.error('Sports TV Channels Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Sports TV channels',
            message: error.message
        });
    }
};

module.exports = {
    getFootballMatches,
    getStreamInfo,
    getSportsTVChannels
};
