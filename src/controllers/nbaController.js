const axios = require('axios');

// API Sports configuration
const API_BASKETBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_BASKETBALL_URL = 'https://v1.basketball.api-sports.io';

// ========================
// IPTV CONFIGURATIONS
// ========================

// SphereIPTV (existing)
const SPHERE_CONFIG = {
    server: process.env.IPTV_SERVER || 's.rocketdns.info',
    username: process.env.IPTV_USER || '8297117',
    password: process.env.IPTV_PASS || '4501185',
    protocol: process.env.IPTV_PROTOCOL || 'https',
    categories: [
        { id: '135', name: 'US REAL NBA', priority: 2 }
    ]
};

// PearlIPTV (NEW - has better NBA coverage)
const PEARL_CONFIG = {
    server: 'pearlhost2.one',
    port: '80',
    username: 'pearliptv629',
    password: '6sa363brvr',
    protocol: 'http',
    categories: [
        { id: '688', name: 'NBA', priority: 1 }  // Priority 1 = check first
    ]
};

// Sports TV Category (from Sphere)
const SPORTS_TV_CATEGORY = '122';

// Sports TV channels for Basketball
const BASKETBALL_TV_CHANNELS = [
    { stream_id: 3667, name: 'NBA TV UHD', league: 'NBA' },
    { stream_id: 2470, name: 'NBA TV', league: 'NBA' },
    { stream_id: 3751, name: 'NBA TV LHD', league: 'NBA' },
    { stream_id: 3636, name: 'ESPN UHD', league: 'NBA/NCAA' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'NBA/NCAA' },
    { stream_id: 3725, name: 'ESPN (SHD)', league: 'NBA/NCAA' },
    { stream_id: 2581, name: 'ESPN 2 (SHD)', league: 'NBA/NCAA' },
    { stream_id: 2384, name: 'TNT West', league: 'NBA' },
    { stream_id: 74684, name: 'Spectrum SportsNet Lakers', league: 'Lakers' },
    { stream_id: 2436, name: 'NBC Sports Bay Area', league: 'Warriors' },
    { stream_id: 3771, name: 'NBC Sports Chicago', league: 'Bulls' },
    { stream_id: 4435, name: 'MSG', league: 'Knicks' },
    { stream_id: 3695, name: 'YES Network UHD', league: 'Nets' },
    { stream_id: 4443, name: 'Big Ten Network UHD', league: 'NCAA' },
];

// NBA Team aliases - LENGKAP semua 30 tim + singkatan
const TEAM_ALIASES = {
    // Eastern Conference - Atlantic
    'boston celtics': ['celtics', 'boston', 'bos'],
    'brooklyn nets': ['nets', 'brooklyn', 'bkn'],
    'new york knicks': ['knicks', 'ny knicks', 'nyk', 'new york'],
    'philadelphia 76ers': ['76ers', 'sixers', 'philadelphia', 'phi', 'philly'],
    'toronto raptors': ['raptors', 'toronto', 'tor'],
    // Eastern Conference - Central
    'chicago bulls': ['bulls', 'chicago', 'chi'],
    'cleveland cavaliers': ['cavaliers', 'cavs', 'cleveland', 'cle'],
    'detroit pistons': ['pistons', 'detroit', 'det'],
    'indiana pacers': ['pacers', 'indiana', 'ind'],
    'milwaukee bucks': ['bucks', 'milwaukee', 'mil'],
    // Eastern Conference - Southeast
    'atlanta hawks': ['hawks', 'atlanta', 'atl'],
    'charlotte hornets': ['hornets', 'charlotte', 'cha'],
    'miami heat': ['heat', 'miami', 'mia'],
    'orlando magic': ['magic', 'orlando', 'orl'],
    'washington wizards': ['wizards', 'washington', 'was', 'wiz'],
    // Western Conference - Northwest
    'denver nuggets': ['nuggets', 'denver', 'den'],
    'minnesota timberwolves': ['timberwolves', 'wolves', 'minnesota', 'min'],
    'oklahoma city thunder': ['thunder', 'okc thunder', 'okc', 'oklahoma'],
    'portland trail blazers': ['trail blazers', 'blazers', 'portland', 'por'],
    'utah jazz': ['jazz', 'utah', 'uta'],
    // Western Conference - Pacific
    'golden state warriors': ['warriors', 'golden state', 'gsw warriors', 'gsw', 'gs warriors'],
    'los angeles clippers': ['clippers', 'la clippers', 'lac clippers', 'lac'],
    'los angeles lakers': ['lakers', 'la lakers', 'lal lakers', 'lal'],
    'phoenix suns': ['suns', 'phoenix', 'phx'],
    'sacramento kings': ['kings', 'sacramento', 'sac'],
    // Western Conference - Southwest
    'dallas mavericks': ['mavericks', 'mavs', 'dallas', 'dal'],
    'houston rockets': ['rockets', 'houston', 'hou rockets', 'hou'],
    'memphis grizzlies': ['grizzlies', 'memphis', 'mem'],
    'new orleans pelicans': ['pelicans', 'new orleans', 'nop', 'no pelicans'],
    'san antonio spurs': ['spurs', 'san antonio', 'sa spurs', 'sas'],
};

// ========================
// MAIN ENDPOINT
// ========================

const getBasketballMatches = async (req, res) => {
    try {
        // Fetch all data in parallel
        const [fixtures, pearlChannels, sphereChannels, sportsTVChannels] = await Promise.all([
            fetchNBAFixtures(),
            fetchPearlIPTVChannels(),
            fetchSphereIPTVChannels(),
            fetchSportsTVChannels()
        ]);

        // Combine all IPTV channels (Pearl first - better coverage)
        const allChannels = [...pearlChannels, ...sphereChannels];

        // Match fixtures with streams
        const matchedFixtures = matchFixturesWithStreams(fixtures, allChannels);

        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        // Get unmatched channels for Extra Channels section
        const matchedStreamIds = new Set(matchedFixtures.filter(m => m.stream).map(m => m.stream.id));
        const unmatchedChannels = allChannels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => /\bvs\b/i.test(ch.name) || /\b@\b/.test(ch.name))
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
                withStreams: matchedFixtures.filter(m => m.stream).length,
                pearlStreams: pearlChannels.length,
                sphereStreams: sphereChannels.length,
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
        console.error('Basketball Matches Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========================
// FETCH FUNCTIONS
// ========================

// Fetch PearlIPTV channels (NEW)
const fetchPearlIPTVChannels = async () => {
    const allChannels = [];

    for (const category of PEARL_CONFIG.categories) {
        try {
            const url = `${PEARL_CONFIG.protocol}://${PEARL_CONFIG.server}:${PEARL_CONFIG.port}/player_api.php`;
            const response = await axios.get(url, {
                params: {
                    username: PEARL_CONFIG.username,
                    password: PEARL_CONFIG.password,
                    action: 'get_live_streams',
                    category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data
                    .filter(ch => ch.name && (ch.name.includes('vs') || ch.name.includes('@') || ch.name.includes('VS')))
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        icon: ch.stream_icon || null,
                        provider: 'pearl',
                        priority: category.priority
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching Pearl category ${category.id}:`, err.message);
        }
    }

    return allChannels;
};

// Fetch SphereIPTV channels (existing)
const fetchSphereIPTVChannels = async () => {
    const allChannels = [];

    for (const category of SPHERE_CONFIG.categories) {
        try {
            const url = `${SPHERE_CONFIG.protocol}://${SPHERE_CONFIG.server}/player_api.php`;
            const response = await axios.get(url, {
                params: {
                    username: SPHERE_CONFIG.username,
                    password: SPHERE_CONFIG.password,
                    action: 'get_live_streams',
                    category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data.map(ch => ({
                    id: ch.stream_id,
                    name: ch.name,
                    category: category.name,
                    icon: ch.stream_icon || null,
                    provider: 'sphere',
                    priority: category.priority
                }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching Sphere category ${category.id}:`, err.message);
        }
    }

    return allChannels;
};

// Fetch Sports TV channels
const fetchSportsTVChannels = async () => {
    try {
        const url = `${SPHERE_CONFIG.protocol}://${SPHERE_CONFIG.server}/player_api.php`;
        const response = await axios.get(url, {
            params: {
                username: SPHERE_CONFIG.username,
                password: SPHERE_CONFIG.password,
                action: 'get_live_streams',
                category_id: SPORTS_TV_CATEGORY
            },
            timeout: 10000
        });

        if (response.data && Array.isArray(response.data)) {
            const basketballStreamIds = new Set(BASKETBALL_TV_CHANNELS.map(ch => ch.stream_id));
            return response.data
                .filter(ch => basketballStreamIds.has(ch.stream_id))
                .map(ch => {
                    const predefined = BASKETBALL_TV_CHANNELS.find(p => p.stream_id === ch.stream_id);
                    return {
                        id: ch.stream_id,
                        name: predefined?.name || ch.name,
                        icon: ch.stream_icon || null,
                        league: predefined?.league || 'Sports',
                        category: 'Sports TV',
                        type: 'tv_channel',
                        provider: 'sphere'
                    };
                });
        }
        return [];
    } catch (err) {
        console.error('Error fetching Sports TV:', err.message);
        return [];
    }
};

// Fetch NBA fixtures from API-Sports
const fetchNBAFixtures = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const [todayRes, tomorrowRes] = await Promise.all([
            axios.get(`${API_BASKETBALL_URL}/games`, {
                headers: { 'x-apisports-key': API_BASKETBALL_KEY },
                params: { league: 12, season: '2025-2026', date: today },
                timeout: 15000
            }),
            axios.get(`${API_BASKETBALL_URL}/games`, {
                headers: { 'x-apisports-key': API_BASKETBALL_KEY },
                params: { league: 12, season: '2025-2026', date: tomorrow },
                timeout: 15000
            })
        ]);

        const allFixtures = [...(todayRes.data?.response || []), ...(tomorrowRes.data?.response || [])];

        return allFixtures.map(g => ({
            id: g.id,
            date: g.date,
            timestamp: new Date(g.date).getTime() / 1000,
            status: mapStatus(g.status.short),
            statusDetail: g.status.long,
            league: { id: g.league.id, name: g.league.name, logo: g.league.logo },
            homeTeam: { id: g.teams.home.id, name: g.teams.home.name, logo: g.teams.home.logo },
            awayTeam: { id: g.teams.away.id, name: g.teams.away.name, logo: g.teams.away.logo },
            score: { home: g.scores.home.total, away: g.scores.away.total }
        }));
    } catch (error) {
        console.error('Error fetching NBA fixtures:', error.message);
        return [];
    }
};

// ========================
// MATCHING LOGIC
// ========================

const matchFixturesWithStreams = (fixtures, channels) => {
    return fixtures.map(fixture => {
        const stream = findMatchingChannel(fixture, channels);
        return {
            ...fixture,
            stream: stream ? {
                id: stream.id,
                name: stream.name,
                category: stream.category,
                provider: stream.provider
            } : null,
            hasStream: !!stream
        };
    });
};

const findMatchingChannel = (fixture, channels) => {
    const homeAliases = getTeamAliases(fixture.homeTeam.name.toLowerCase());
    const awayAliases = getTeamAliases(fixture.awayTeam.name.toLowerCase());

    // Sort channels by priority (lower = better)
    const sortedChannels = [...channels].sort((a, b) => (a.priority || 99) - (b.priority || 99));

    for (const channel of sortedChannels) {
        const name = channel.name.toLowerCase();

        // Check if both teams are in the channel name
        const hasHome = homeAliases.some(a => name.includes(a));
        const hasAway = awayAliases.some(a => name.includes(a));

        if (hasHome && hasAway) {
            return channel;
        }
    }
    return null;
};

const getTeamAliases = (name) => {
    const aliases = [name];
    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (name.includes(key) || values.some(v => name.includes(v))) {
            aliases.push(key, ...values);
        }
    }
    return [...new Set(aliases)];
};

const mapStatus = (status) => {
    if (['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE', 'BT'].includes(status)) return 'LIVE';
    if (['FT', 'AOT', 'POST'].includes(status)) return 'FINISHED';
    return 'UPCOMING';
};

// ========================
// SINGLE MATCH & STREAM ENDPOINTS
// ========================

const getBasketballMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const fixtures = await fetchNBAFixtures();
        const match = fixtures.find(f => f.id === parseInt(id));

        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }

        // Fetch all channels
        const [pearlChannels, sphereChannels] = await Promise.all([
            fetchPearlIPTVChannels(),
            fetchSphereIPTVChannels()
        ]);

        const allChannels = [...pearlChannels, ...sphereChannels];
        const stream = findMatchingChannel(match, allChannels);

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

const getBasketballStream = async (req, res) => {
    try {
        const { streamId } = req.params;
        const provider = req.query.provider || 'sphere';

        // Fetch channels based on provider
        let channels = [];
        if (provider === 'pearl') {
            channels = await fetchPearlIPTVChannels();
        } else {
            channels = await fetchSphereIPTVChannels();
        }

        // Also check Sports TV
        const sportsTVChannels = await fetchSportsTVChannels();
        const allChannels = [...channels, ...sportsTVChannels];

        const channel = allChannels.find(ch => ch.id === parseInt(streamId));

        if (!channel) {
            return res.status(404).json({ success: false, error: 'Stream not found' });
        }

        // Build stream URL based on provider
        let streamUrl;
        if (channel.provider === 'pearl') {
            streamUrl = `${PEARL_CONFIG.protocol}://${PEARL_CONFIG.server}:${PEARL_CONFIG.port}/live/${PEARL_CONFIG.username}/${PEARL_CONFIG.password}/${streamId}.m3u8`;
        } else {
            streamUrl = `${SPHERE_CONFIG.protocol}://${SPHERE_CONFIG.server}/live/${SPHERE_CONFIG.username}/${SPHERE_CONFIG.password}/${streamId}.m3u8`;
        }

        // Try to find matching fixture
        const fixtures = await fetchNBAFixtures();
        const match = fixtures.find(f => {
            const name = channel.name.toLowerCase();
            const homeAliases = getTeamAliases(f.homeTeam.name.toLowerCase());
            const awayAliases = getTeamAliases(f.awayTeam.name.toLowerCase());
            return homeAliases.some(a => name.includes(a)) && awayAliases.some(a => name.includes(a));
        });

        res.json({
            success: true,
            stream: {
                id: channel.id,
                name: channel.name,
                url: streamUrl,
                category: channel.category,
                icon: channel.icon,
                provider: channel.provider,
                type: channel.type || 'match'
            },
            match: match || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getBasketballMatches,
    getBasketballMatch,
    getBasketballStream
};
