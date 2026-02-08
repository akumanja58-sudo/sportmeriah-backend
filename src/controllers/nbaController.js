const axios = require('axios');

// API Sports configuration
const API_BASKETBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_BASKETBALL_URL = 'https://v1.basketball.api-sports.io';

// IPTV configuration
const IPTV_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const IPTV_USER = process.env.IPTV_USER || '8297117';
const IPTV_PASS = process.env.IPTV_PASS || '4501185';
const IPTV_PROTOCOL = process.env.IPTV_PROTOCOL || 'https';

// Basketball IPTV Categories
const BASKETBALL_CATEGORIES = [
    { id: '135', name: 'US REAL NBA', priority: 1 },
];

// Sports TV Category 122
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

// Get all basketball matches
const getBasketballMatches = async (req, res) => {
    try {
        const [fixtures, iptvChannels, sportsTVChannels] = await Promise.all([
            fetchNBAFixtures(),
            fetchIPTVChannels(),
            fetchSportsTVChannels()
        ]);

        const matchedFixtures = matchFixturesWithStreams(fixtures, iptvChannels);
        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        const matchedStreamIds = new Set(matchedFixtures.filter(m => m.stream).map(m => m.stream.id));
        const unmatchedChannels = iptvChannels
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

// Fetch Sports TV channels
const fetchSportsTVChannels = async () => {
    try {
        const response = await axios.get(`${IPTV_PROTOCOL}://${IPTV_SERVER}/player_api.php`, {
            params: { username: IPTV_USER, password: IPTV_PASS, action: 'get_live_streams', category_id: SPORTS_TV_CATEGORY },
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
                        type: 'tv_channel'
                    };
                });
        }
        return [];
    } catch (err) {
        console.error('Error fetching Sports TV:', err.message);
        return [];
    }
};

// Fetch NBA fixtures
const fetchNBAFixtures = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

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

// Fetch IPTV channels
const fetchIPTVChannels = async () => {
    const allChannels = [];
    for (const category of BASKETBALL_CATEGORIES) {
        try {
            const response = await axios.get(`${IPTV_PROTOCOL}://${IPTV_SERVER}/player_api.php`, {
                params: { username: IPTV_USER, password: IPTV_PASS, action: 'get_live_streams', category_id: category.id },
                timeout: 10000
            });
            if (response.data && Array.isArray(response.data)) {
                allChannels.push(...response.data.map(ch => ({
                    id: ch.stream_id, name: ch.name, category: category.name, icon: ch.stream_icon || null
                })));
            }
        } catch (err) {
            console.error(`Error fetching category ${category.id}:`, err.message);
        }
    }
    return allChannels;
};

// Match fixtures with streams
const matchFixturesWithStreams = (fixtures, channels) => {
    return fixtures.map(fixture => {
        const stream = findMatchingChannel(fixture, channels);
        return { ...fixture, stream: stream ? { id: stream.id, name: stream.name, category: stream.category } : null, hasStream: !!stream };
    });
};

const findMatchingChannel = (fixture, channels) => {
    const homeAliases = getTeamAliases(fixture.homeTeam.name.toLowerCase());
    const awayAliases = getTeamAliases(fixture.awayTeam.name.toLowerCase());

    for (const channel of channels) {
        const name = channel.name.toLowerCase();
        if (homeAliases.some(a => name.includes(a)) && awayAliases.some(a => name.includes(a))) {
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
    if (['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE'].includes(status)) return 'LIVE';
    if (['FT', 'AOT', 'POST'].includes(status)) return 'FINISHED';
    return 'UPCOMING';
};

// Get stream info
const getStreamInfo = async (req, res) => {
    try {
        const { streamId } = req.params;
        const [iptvChannels, sportsTVChannels] = await Promise.all([fetchIPTVChannels(), fetchSportsTVChannels()]);
        const channel = [...iptvChannels, ...sportsTVChannels].find(ch => ch.id === parseInt(streamId));

        if (!channel) return res.status(404).json({ success: false, error: 'Stream not found' });

        const streamUrl = `${IPTV_PROTOCOL}://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${streamId}.m3u8`;
        const fixtures = await fetchNBAFixtures();
        const match = fixtures.find(f => {
            const name = channel.name.toLowerCase();
            const homeAliases = getTeamAliases(f.homeTeam.name.toLowerCase());
            const awayAliases = getTeamAliases(f.awayTeam.name.toLowerCase());
            return homeAliases.some(a => name.includes(a)) && awayAliases.some(a => name.includes(a));
        });

        res.json({
            success: true,
            stream: { id: channel.id, name: channel.name, url: streamUrl, category: channel.category, icon: channel.icon, league: channel.league, type: channel.type || 'match' },
            match: match || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get single match by game ID
const getBasketballMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const fixtures = await fetchNBAFixtures();
        const match = fixtures.find(f => f.id === parseInt(id));

        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }

        const iptvChannels = await fetchIPTVChannels();
        const stream = findMatchingChannel(match, iptvChannels);

        res.json({
            success: true,
            match: { ...match, stream: stream ? { id: stream.id, name: stream.name, category: stream.category } : null }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get stream by stream ID (alias for getStreamInfo)
const getBasketballStream = async (req, res) => {
    req.params.streamId = req.params.streamId;
    return getStreamInfo(req, res);
};

module.exports = { getBasketballMatches, getBasketballMatch, getBasketballStream, getStreamInfo };
