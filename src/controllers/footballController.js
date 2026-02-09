const axios = require('axios');

// API Sports configuration
const API_SPORTS_KEY = process.env.FOOTBALL_API_KEY;
const API_SPORTS_URL = 'https://v3.football.api-sports.io';

// ========================
// IPTV PROVIDER CONFIGS
// ========================

// SphereIPTV (existing)
const SPHERE_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const SPHERE_USER = process.env.IPTV_USER || '8297117';
const SPHERE_PASS = process.env.IPTV_PASS || '4501185';
const SPHERE_PROTOCOL = process.env.IPTV_PROTOCOL || 'https';

// PearlIPTV (new)
const PEARL_SERVER = process.env.PEARL_SERVER || 'pearlhost2.one';
const PEARL_USER = process.env.PEARL_USER || 'pearliptv629';
const PEARL_PASS = process.env.PEARL_PASS || '6sa363brvr';
const PEARL_PORT = process.env.PEARL_PORT || '80';

// VPS Config
const VPS_IP = process.env.VPS_IP || '173.249.27.15';

// ========================
// CATEGORY CONFIGS
// ========================

// SphereIPTV Football Categories
const SPHERE_FOOTBALL_CATEGORIES = [
    { id: '171', name: 'SPORTS - SOCCER', priority: 1 },
];

// PearlIPTV Football Categories - per league
const PEARL_FOOTBALL_CATEGORIES = [
    { id: '1193', name: 'LA LIGA SPORT', league_id: 140, priority: 1 },
    { id: '1192', name: 'LEAGUES SERIE A', league_id: 135, priority: 1 },
    { id: '1936', name: 'SERIE A (US)', league_id: 135, priority: 2 },
    { id: '2281', name: 'BUNDESLIGA PPV', league_id: 78, priority: 1 },
    { id: '1933', name: 'LIGUE PLUS', league_id: 61, priority: 1 },
    { id: '1796', name: 'DAZN LIGUE 1', league_id: 61, priority: 2 },
    { id: '1677', name: 'UEFA CHAMPIONS LEAGUE (UK)', league_id: 2, priority: 1 },
    { id: '2132', name: 'UEFA CHAMPIONS LEAGUE (CA)', league_id: 2, priority: 2 },
    { id: '1678', name: 'UEFA EUROPA LEAGUE', league_id: 3, priority: 1 },
    { id: '1932', name: 'SAUDI PRO LEAGUE', league_id: 307, priority: 1 },
    { id: '1310', name: 'EPL PREMIER LEAGUE', league_id: 39, priority: 2 }, // backup for EPL
    { id: '2084', name: 'WORLD FOOTBALL EVENTS', league_id: null, priority: 3 },
];

// Sports TV Category (Category 122) - Premium Sports Channels (SphereIPTV)
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

// ========================
// LEAGUE ROUTING
// ========================

// League → Provider routing (mana yang prioritas)
// 'sphere' = SphereIPTV dulu, fallback PearlIPTV
// 'pearl' = PearlIPTV dulu, fallback SphereIPTV
const LEAGUE_PROVIDER = {
    140: 'sphere',   // La Liga
    135: 'sphere',   // Serie A
    78: 'sphere',    // Bundesliga
    61: 'sphere',    // Ligue 1
    2: 'sphere',     // Champions League
    3: 'sphere',     // Europa League
    848: 'sphere',   // Conference League
    307: 'sphere',   // Saudi Pro League
    39: 'sphere',    // EPL
    45: 'sphere',    // FA Cup
    48: 'sphere',    // League Cup
    143: 'sphere',   // Copa del Rey
    137: 'sphere',   // Coppa Italia
    529: 'sphere',   // Super Cup
    531: 'sphere',   // UEFA Super Cup
    253: 'sphere',   // MLS
    262: 'sphere',   // Liga MX
    94: 'sphere',    // Primeira Liga
};

// PearlIPTV Team → Stream ID mapping (La Liga)
const PEARL_LA_LIGA_TEAMS = {
    'alaves': 511016,
    'almeria': 511015,
    'athletic bilbao': 511014,
    'athletic club': 511014,
    'atletico madrid': 511013,
    'atletico': 511013,
    'barcelona': 511012,
    'cadiz': 511011,
    'celta vigo': 511010,
    'celta': 511010,
    'getafe': 511009,
    'girona': 511008,
    'granada': 511007,
    'las palmas': 511006,
    'mallorca': 511005,
    'osasuna': 511004,
    'rayo vallecano': 511003,
    'rayo': 511003,
    'real betis': 511002,
    'betis': 511002,
    'real madrid': 511001,
    'real sociedad': 511000,
    'sevilla': 510999,
    'valencia': 510998,
    'villarreal': 510997,
    'villareal': 510997,
    // Newly promoted / additional teams - tambahin di sini kalo ada
    'espanyol': null,
    'leganes': null,
    'valladolid': null,
};

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
    'atletico madrid': ['atletico', 'atlético madrid', 'atlético', 'atletico de madrid'],
    'real madrid': ['real'],
    'barcelona': ['barca', 'barça'],
    'bayern munich': ['bayern', 'bayern münchen', 'bayern munchen'],
    'borussia dortmund': ['dortmund', 'bvb'],
    'psg': ['paris saint germain', 'paris saint-germain', 'paris sg'],
    'inter': ['inter milan', 'internazionale'],
    'ac milan': ['milan'],
    'rb leipzig': ['leipzig'],
    'deportivo alaves': ['deportivo alavés', 'alaves', 'alavés'],
    'vitoria guimaraes': ['vitória guimarães', 'guimaraes', 'guimarães'],
    'al nassr': ['al-nassr', 'nassr'],
    'pumas unam': ['pumas', 'unam'],
    'athletic club': ['athletic bilbao', 'athletic'],
    'real betis': ['betis'],
    'real sociedad': ['sociedad'],
    'celta vigo': ['celta'],
    'rayo vallecano': ['rayo'],
};

// ========================
// MAIN FUNCTIONS
// ========================

// Get all football matches with streams
const getFootballMatches = async (req, res) => {
    try {
        // Fetch fixtures, IPTV channels from both providers, and Sports TV channels in parallel
        const [fixtures, sphereChannels, pearlChannels, sportsTVChannels] = await Promise.all([
            fetchFixtures(),
            fetchSphereIPTVChannels(),
            fetchPearlIPTVChannels(),
            fetchSportsTVChannels()
        ]);

        // Match fixtures with streams from BOTH providers
        const matchedFixtures = matchFixturesWithStreams(fixtures, sphereChannels, pearlChannels);

        // Separate by status
        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        // Get unmatched IPTV channels (SphereIPTV only - these have "vs" format)
        const matchedStreamIds = new Set(
            matchedFixtures
                .filter(m => m.stream && m.stream.provider === 'sphere')
                .map(m => m.stream.id)
        );
        const unmatchedChannels = sphereChannels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => hasTeamNames(ch.name))
            .slice(0, 50);

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
                sphereStreams: matchedFixtures.filter(m => m.stream?.provider === 'sphere').length,
                pearlStreams: matchedFixtures.filter(m => m.stream?.provider === 'pearl').length,
                sportsTVChannels: sportsTVChannels.length
            },
            matches: {
                live: liveMatches,
                upcoming: upcomingMatches,
                finished: finishedMatches.slice(0, 20)
            },
            extraChannels: unmatchedChannels,
            sportsTVChannels: sportsTVChannels
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

// ========================
// FETCH FUNCTIONS
// ========================

// Fetch fixtures from API Sports
const fetchFixtures = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

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

// Fetch IPTV channels - SphereIPTV (existing logic, unchanged)
const fetchSphereIPTVChannels = async () => {
    const allChannels = [];

    for (const category of SPHERE_FOOTBALL_CATEGORIES) {
        try {
            const response = await axios.get(`${SPHERE_PROTOCOL}://${SPHERE_SERVER}/player_api.php`, {
                params: {
                    username: SPHERE_USER,
                    password: SPHERE_PASS,
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
                        icon: ch.stream_icon || null,
                        provider: 'sphere'
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching Sphere category ${category.id}:`, err.message);
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

// Fetch IPTV channels - PearlIPTV (NEW)
const fetchPearlIPTVChannels = async () => {
    const allChannels = [];

    for (const category of PEARL_FOOTBALL_CATEGORIES) {
        try {
            const response = await axios.get(`http://${PEARL_SERVER}:${PEARL_PORT}/player_api.php`, {
                params: {
                    username: PEARL_USER,
                    password: PEARL_PASS,
                    action: 'get_live_streams',
                    category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data
                    .filter(ch => !isExcludedChannel(ch.name))
                    .filter(ch => ch.name !== `✦ ✦ ✦ ${category.name} ✦ ✦ ✦`) // Skip header
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        league_id: category.league_id,
                        icon: ch.stream_icon || null,
                        provider: 'pearl'
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching Pearl category ${category.id}:`, err.message);
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

// Fetch Sports TV channels from SphereIPTV Category 122 (unchanged)
const fetchSportsTVChannels = async () => {
    try {
        const response = await axios.get(`${SPHERE_PROTOCOL}://${SPHERE_SERVER}/player_api.php`, {
            params: {
                username: SPHERE_USER,
                password: SPHERE_PASS,
                action: 'get_live_streams',
                category_id: SPORTS_TV_CATEGORY
            },
            timeout: 10000
        });

        if (response.data && Array.isArray(response.data)) {
            const footballStreamIds = new Set(FOOTBALL_TV_CHANNELS.map(ch => ch.stream_id));

            const channels = response.data
                .filter(ch => footballStreamIds.has(ch.stream_id))
                .map(ch => {
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

// ========================
// MATCHING LOGIC
// ========================

// Match fixtures with streams from BOTH providers
const matchFixturesWithStreams = (fixtures, sphereChannels, pearlChannels) => {
    return fixtures.map(fixture => {
        const stream = findBestStream(fixture, sphereChannels, pearlChannels);
        return {
            ...fixture,
            stream: stream ? {
                id: stream.id,
                name: stream.name,
                category: stream.category,
                provider: stream.provider // 'sphere' or 'pearl'
            } : null,
            hasStream: !!stream
        };
    });
};

// Find best stream for a fixture - checks both providers with priority
const findBestStream = (fixture, sphereChannels, pearlChannels) => {
    const leagueId = fixture.league.id;
    const preferredProvider = LEAGUE_PROVIDER[leagueId] || 'sphere';

    if (preferredProvider === 'pearl') {
        // Try PearlIPTV first
        const pearlStream = findPearlStream(fixture, pearlChannels);
        if (pearlStream) return pearlStream;

        // Fallback to SphereIPTV
        const sphereStream = findSphereStream(fixture, sphereChannels);
        if (sphereStream) return sphereStream;
    } else {
        // Try SphereIPTV first
        const sphereStream = findSphereStream(fixture, sphereChannels);
        if (sphereStream) return sphereStream;

        // Fallback to PearlIPTV
        const pearlStream = findPearlStream(fixture, pearlChannels);
        if (pearlStream) return pearlStream;
    }

    return null;
};

// Find stream in SphereIPTV (existing logic - match by team names in channel name)
const findSphereStream = (fixture, channels) => {
    const homeTeam = normalizeTeamName(fixture.homeTeam.name);
    const awayTeam = normalizeTeamName(fixture.awayTeam.name);
    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);

    for (const channel of channels) {
        const channelName = channel.name.toLowerCase();

        const hasHome = homeAliases.some(alias => channelName.includes(alias));
        const hasAway = awayAliases.some(alias => channelName.includes(alias));

        if (hasHome && hasAway) {
            return channel;
        }
    }

    return null;
};

// Find stream in PearlIPTV (NEW - match by team name to stream ID)
const findPearlStream = (fixture, channels) => {
    const leagueId = fixture.league.id;

    // La Liga OR Copa del Rey - use team-based mapping
    if (leagueId === 140 || leagueId === 143) {
        return findPearlLaLigaStream(fixture);
    }

    // Check if this league is supported by PearlIPTV at all
    const supportedLeagueIds = new Set(
        PEARL_FOOTBALL_CATEGORIES
            .filter(c => c.league_id !== null)
            .map(c => c.league_id)
    );

    // Map cup competitions to their league counterpart
    const cupToLeague = {
        137: 135,  // Coppa Italia → Serie A
        66: 61,    // Coupe de France → Ligue 1
    };
    const targetLeagueId = cupToLeague[leagueId] || leagueId;

    if (!supportedLeagueIds.has(targetLeagueId)) {
        return null; // This league isn't covered by Pearl
    }

    const homeTeam = normalizeTeamName(fixture.homeTeam.name);
    const awayTeam = normalizeTeamName(fixture.awayTeam.name);
    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);

    // First pass: "vs" format channels (both teams match) - best quality match
    for (const channel of channels) {
        const channelName = channel.name.toLowerCase();
        const hasHome = homeAliases.some(alias => alias.length >= 4 && channelName.includes(alias));
        const hasAway = awayAliases.some(alias => alias.length >= 4 && channelName.includes(alias));

        if (hasHome && hasAway) {
            return channel;
        }
    }

    // Second pass: per-team channels, ONLY from matching league category
    for (const channel of channels) {
        if (!channel.league_id || channel.league_id !== targetLeagueId) continue;

        const channelName = channel.name.toLowerCase();
        const hasHome = homeAliases.some(alias => alias.length >= 4 && channelName.includes(alias));
        const hasAway = awayAliases.some(alias => alias.length >= 4 && channelName.includes(alias));

        if (hasHome || hasAway) {
            return channel;
        }
    }

    return null;
};

// Find La Liga stream from PearlIPTV using team mapping
const findPearlLaLigaStream = (fixture) => {
    const homeTeam = normalizeTeamName(fixture.homeTeam.name);
    const awayTeam = normalizeTeamName(fixture.awayTeam.name);
    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);

    // Try to find home team stream first (usually home team channel)
    for (const alias of homeAliases) {
        if (PEARL_LA_LIGA_TEAMS[alias] !== undefined && PEARL_LA_LIGA_TEAMS[alias] !== null) {
            return {
                id: PEARL_LA_LIGA_TEAMS[alias],
                name: `LA LIGA - ${fixture.homeTeam.name}`,
                category: 'LA LIGA SPORT',
                provider: 'pearl'
            };
        }
    }

    // Try away team
    for (const alias of awayAliases) {
        if (PEARL_LA_LIGA_TEAMS[alias] !== undefined && PEARL_LA_LIGA_TEAMS[alias] !== null) {
            return {
                id: PEARL_LA_LIGA_TEAMS[alias],
                name: `LA LIGA - ${fixture.awayTeam.name}`,
                category: 'LA LIGA SPORT',
                provider: 'pearl'
            };
        }
    }

    return null;
};

// ========================
// HELPER FUNCTIONS
// ========================

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

    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (normalizedName.includes(key) || values.some(v => normalizedName.includes(v))) {
            aliases.push(key, ...values);
        }
    }

    return [...new Set(aliases)];
};

// Check if channel name contains team names
const hasTeamNames = (channelName) => {
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

// ========================
// STREAM INFO & URL BUILDER
// ========================

// Get single stream info - UPDATED to support both providers
const getStreamInfo = async (req, res) => {
    try {
        const { streamId } = req.params;
        const provider = req.query.provider || 'sphere'; // default sphere

        let streamUrl;
        let channel = null;

        if (provider === 'pearl') {
            // PearlIPTV - proxy through VPS
            streamUrl = `http://${VPS_IP}/hls/pearl_${streamId}.m3u8`;

            // Try to find channel info
            const pearlChannels = await fetchPearlIPTVChannels();
            channel = pearlChannels.find(ch => ch.id === parseInt(streamId));
        } else {
            // SphereIPTV - existing logic
            streamUrl = `${SPHERE_PROTOCOL}://${SPHERE_SERVER}/live/${SPHERE_USER}/${SPHERE_PASS}/${streamId}.m3u8`;

            const [iptvChannels, sportsTVChannels] = await Promise.all([
                fetchSphereIPTVChannels(),
                fetchSportsTVChannels()
            ]);
            const allChannels = [...iptvChannels, ...sportsTVChannels];
            channel = allChannels.find(ch => ch.id === parseInt(streamId));
        }

        if (!channel) {
            // Build basic channel info even if not found in list
            channel = {
                id: parseInt(streamId),
                name: `Stream ${streamId}`,
                category: provider === 'pearl' ? 'PearlIPTV' : 'SphereIPTV',
                icon: null,
                provider: provider
            };
        }

        // Try to find matching fixture
        const fixtures = await fetchFixtures();
        const match = findMatchingFixture(channel.name, fixtures);

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
                type: channel.type || 'match',
                provider: provider
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
const parseChannelName = (channelName) => {
    const vsMatch = channelName.match(/([^:]+)\s+vs\s+([^@]+)/i);

    if (vsMatch) {
        let homeTeam = vsMatch[1].trim();
        let awayTeam = vsMatch[2].trim();

        homeTeam = homeTeam.replace(/^.*?:\s*/, '').trim();
        awayTeam = awayTeam.replace(/@.*$/, '').trim();

        const leagueMatch = channelName.match(/:\s*([^:]+?)\s*:\s*[^:]+vs/i);
        const league = leagueMatch ? leagueMatch[1].trim() : null;

        return { homeTeam, awayTeam, league, raw: channelName };
    }

    // Try PearlIPTV format: "LA LIGA - Team Name"
    const pearlMatch = channelName.match(/^(?:LA LIGA|SERIE A|BUNDESLIGA|LIGUE 1)\s*-\s*(.+)$/i);
    if (pearlMatch) {
        return {
            homeTeam: pearlMatch[1].trim(),
            awayTeam: null,
            league: channelName.split('-')[0].trim(),
            raw: channelName
        };
    }

    return { homeTeam: null, awayTeam: null, league: null, raw: channelName };
};

// ========================
// SPORTS TV CHANNELS
// ========================

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

// Get single match by fixture ID
const getFootballMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const fixtures = await fetchFixtures();
        const match = fixtures.find(f => f.id === parseInt(id));

        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }

        const [sphereChannels, pearlChannels] = await Promise.all([
            fetchSphereIPTVChannels(),
            fetchPearlIPTVChannels()
        ]);

        const stream = findBestStream(match, sphereChannels, pearlChannels);

        res.json({
            success: true,
            match: {
                ...match,
                stream: stream ? {
                    id: stream.id,
                    name: stream.name,
                    category: stream.category,
                    provider: stream.provider
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get stream by stream ID (alias)
const getFootballStream = async (req, res) => {
    return getStreamInfo(req, res);
};

module.exports = {
    getFootballMatches,
    getFootballMatch,
    getFootballStream,
    getStreamInfo,
    getSportsTVChannels
};
