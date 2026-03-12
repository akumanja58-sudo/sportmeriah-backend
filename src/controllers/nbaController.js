const axios = require('axios');

// API Sports configuration (same key covers all sports)
const API_BASKETBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_BASKETBALL_URL = 'https://v1.basketball.api-sports.io';

// ========================
// IPTV PROVIDER CONFIG
// ========================

// SphereIPTV only for basketball (Pearl = football only)
const SPHERE_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const SPHERE_PORT = process.env.IPTV_PORT || '8080';
const SPHERE_USER = process.env.IPTV_USER || '5986529';
const SPHERE_PASS = process.env.IPTV_PASS || '0044003';
const SPHERE_PROTOCOL = process.env.IPTV_PROTOCOL || 'http';

// VPS Config (HLS proxy)
const VPS_IP = process.env.VPS_IP || '173.249.27.15';

// ========================
// CATEGORY CONFIGS
// ========================

// Sphere Basketball Categories
const SPHERE_BASKETBALL_CATEGORIES = [
    { id: '135', name: 'SPORTS - NBA', league: 'NBA', priority: 1 },
    { id: '384', name: 'SPORTS - NBA G LEAGUE', league: 'NBA G League', priority: 3 },
    { id: '388', name: 'SPORTS - WNBA', league: 'WNBA', priority: 2 },
    { id: '242', name: 'SPORTS - NCAA MEN\'s BASKETBALL', league: 'NCAA', priority: 2 },
    { id: '243', name: 'SPORTS - NCAA WOMEN\'s BASKETBALL', league: 'NCAA W', priority: 3 },
];

// Sports TV Category (Category 122) - Premium Sports Channels
const SPORTS_TV_CATEGORY = '122';

// Sports TV channels relevant for Basketball
const BASKETBALL_TV_CHANNELS = [
    // NBA TV
    { stream_id: 3667, name: 'NBA TV UHD', league: 'NBA' },
    { stream_id: 2470, name: 'NBA TV', league: 'NBA' },
    { stream_id: 3751, name: 'NBA TV LHD', league: 'NBA' },

    // ESPN (NBA, NCAA)
    { stream_id: 3636, name: 'ESPN UHD', league: 'NBA/NCAA' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'NBA/NCAA' },
    { stream_id: 3725, name: 'ESPN (SHD)', league: 'NBA/NCAA' },
    { stream_id: 2581, name: 'ESPN 2 (SHD)', league: 'NBA/NCAA' },

    // TNT
    { stream_id: 2384, name: 'TNT West', league: 'NBA' },

    // Regional Sports Networks
    { stream_id: 74684, name: 'Spectrum SportsNet Lakers', league: 'Lakers' },
    { stream_id: 2436, name: 'NBC Sports Bay Area', league: 'Warriors' },
    { stream_id: 3771, name: 'NBC Sports Chicago', league: 'Bulls' },
    { stream_id: 4435, name: 'MSG', league: 'Knicks' },
    { stream_id: 3695, name: 'YES Network UHD', league: 'Nets' },

    // College
    { stream_id: 4443, name: 'Big Ten Network UHD', league: 'NCAA' },
];

// ========================
// NBA TEAM ALIASES
// ========================

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
        // Only fetch NBA category by default, or specific category via query
        const categoryFilter = req.query.category || 'nba'; // nba, wnba, ncaa, gleague, all
        const categoriesToFetch = getCategoriesForFilter(categoryFilter);

        // Fetch all data in parallel
        const [fixtures, sphereChannels, sportsTVChannels] = await Promise.all([
            fetchNBAFixtures(),
            fetchSphereChannels(categoriesToFetch),
            fetchSportsTVChannels()
        ]);

        // Match fixtures with streams
        const matchedFixtures = matchFixturesWithStreams(fixtures, sphereChannels);

        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        // Get unmatched channels (extra games not in API)
        const matchedStreamIds = new Set(matchedFixtures.filter(m => m.stream).map(m => m.stream.id));
        const unmatchedChannels = sphereChannels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => /\bvs\b/i.test(ch.name))
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
                sphereStreams: matchedFixtures.filter(m => m.stream?.provider === 'sphere').length,
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
// CATEGORY FILTER
// ========================

const getCategoriesForFilter = (filter) => {
    switch (filter.toLowerCase()) {
        case 'nba':
            return SPHERE_BASKETBALL_CATEGORIES.filter(c => c.id === '135');
        case 'wnba':
            return SPHERE_BASKETBALL_CATEGORIES.filter(c => c.id === '388');
        case 'ncaa':
            return SPHERE_BASKETBALL_CATEGORIES.filter(c => ['242', '243'].includes(c.id));
        case 'gleague':
            return SPHERE_BASKETBALL_CATEGORIES.filter(c => c.id === '384');
        case 'all':
            return SPHERE_BASKETBALL_CATEGORIES;
        default:
            return SPHERE_BASKETBALL_CATEGORIES.filter(c => c.id === '135');
    }
};

// ========================
// FETCH FUNCTIONS
// ========================

// Fetch Sphere IPTV channels for basketball
const fetchSphereChannels = async (categories) => {
    const allChannels = [];

    for (const category of categories) {
        try {
            const response = await axios.get(`${SPHERE_PROTOCOL}://${SPHERE_SERVER}:${SPHERE_PORT}/player_api.php`, {
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
                    .filter(ch => !ch.name.includes('✦')) // Skip header rows
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        league: category.league,
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

    // Remove duplicates
    const seen = new Set();
    return allChannels.filter(ch => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
    });
};

// Fetch Sports TV channels from Sphere Category 122
const fetchSportsTVChannels = async () => {
    try {
        const response = await axios.get(`${SPHERE_PROTOCOL}://${SPHERE_SERVER}:${SPHERE_PORT}/player_api.php`, {
            params: {
                username: SPHERE_USER,
                password: SPHERE_PASS,
                action: 'get_live_streams',
                category_id: SPORTS_TV_CATEGORY
            },
            timeout: 10000
        });

        if (response.data && Array.isArray(response.data)) {
            const basketballStreamIds = new Set(BASKETBALL_TV_CHANNELS.map(ch => ch.stream_id));

            const channels = response.data
                .filter(ch => basketballStreamIds.has(ch.stream_id))
                .map(ch => {
                    const predefined = BASKETBALL_TV_CHANNELS.find(p => p.stream_id === ch.stream_id);
                    return {
                        id: ch.stream_id,
                        name: predefined?.name || ch.name,
                        originalName: ch.name,
                        icon: ch.stream_icon || null,
                        league: predefined?.league || 'Sports',
                        category: 'Sports TV',
                        type: 'tv_channel',
                        provider: 'sphere'
                    };
                });

            // Sort by predefined order
            const orderMap = new Map(BASKETBALL_TV_CHANNELS.map((ch, idx) => [ch.stream_id, idx]));
            channels.sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));

            return channels;
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
            elapsed: g.status.timer || null,
            quarter: g.status.short || null,
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
            scores: {
                home: {
                    q1: g.scores.home.quarter_1,
                    q2: g.scores.home.quarter_2,
                    q3: g.scores.home.quarter_3,
                    q4: g.scores.home.quarter_4,
                    ot: g.scores.home.over_time,
                    total: g.scores.home.total
                },
                away: {
                    q1: g.scores.away.quarter_1,
                    q2: g.scores.away.quarter_2,
                    q3: g.scores.away.quarter_3,
                    q4: g.scores.away.quarter_4,
                    ot: g.scores.away.over_time,
                    total: g.scores.away.total
                }
            }
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

    // First pass: both teams match (best)
    for (const channel of sortedChannels) {
        const name = channel.name.toLowerCase();
        const hasHome = homeAliases.some(a => a.length >= 3 && name.includes(a));
        const hasAway = awayAliases.some(a => a.length >= 3 && name.includes(a));

        if (hasHome && hasAway) {
            return channel;
        }
    }

    return null;
};

// ========================
// HELPER FUNCTIONS
// ========================

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

const isExcludedChannel = (name) => {
    const excludePatterns = [
        /test/i,
        /backup/i,
        /offline/i,
        /\[.*\]/,
        /no event/i,
    ];
    return excludePatterns.some(pattern => pattern.test(name));
};

// ========================
// STREAM INFO & URL BUILDER
// ========================

const getStreamInfo = async (req, res) => {
    try {
        const { streamId } = req.params;

        // Stream URL via VPS HLS proxy (Sphere only for basketball)
        const streamUrl = `http://${VPS_IP}/hls/sphere_${streamId}.m3u8`;

        // Try to find channel info
        const channels = await fetchSphereChannels(SPHERE_BASKETBALL_CATEGORIES);
        const sportsTVChannels = await fetchSportsTVChannels();
        const allChannels = [...channels, ...sportsTVChannels];

        let channel = allChannels.find(ch => ch.id === parseInt(streamId));

        if (!channel) {
            channel = {
                id: parseInt(streamId),
                name: `Stream ${streamId}`,
                category: 'SphereIPTV',
                icon: null,
                provider: 'sphere'
            };
        }

        // Try to find matching fixture
        const fixtures = await fetchNBAFixtures();
        const match = fixtures.find(f => {
            const name = channel.name.toLowerCase();
            const homeAliases = getTeamAliases(f.homeTeam.name.toLowerCase());
            const awayAliases = getTeamAliases(f.awayTeam.name.toLowerCase());
            return homeAliases.some(a => a.length >= 3 && name.includes(a)) &&
                awayAliases.some(a => a.length >= 3 && name.includes(a));
        });

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
                provider: 'sphere'
            },
            match: match || null
        });
    } catch (error) {
        console.error('Stream Info Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========================
// SINGLE MATCH ENDPOINT
// ========================

const getBasketballMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const fixtures = await fetchNBAFixtures();
        const match = fixtures.find(f => f.id === parseInt(id));

        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }

        const channels = await fetchSphereChannels(SPHERE_BASKETBALL_CATEGORIES);
        const stream = findMatchingChannel(match, channels);

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

// Alias
const getBasketballStream = async (req, res) => {
    return getStreamInfo(req, res);
};

// ========================
// SPORTS TV ENDPOINT
// ========================

const getSportsTVChannels = async (req, res) => {
    try {
        const channels = await fetchSportsTVChannels();
        res.json({
            success: true,
            sport: 'basketball',
            timestamp: new Date().toISOString(),
            count: channels.length,
            channels: channels
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getBasketballMatches,
    getBasketballMatch,
    getBasketballStream,
    getStreamInfo,
    getSportsTVChannels
};
