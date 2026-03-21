const axios = require('axios');

// ========================
// IPTV PROVIDER CONFIG
// ========================

const SPHERE_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const SPHERE_PORT = process.env.IPTV_PORT || '8080';
const SPHERE_USER = process.env.IPTV_USER || '5986529';
const SPHERE_PASS = process.env.IPTV_PASS || '0044003';
const SPHERE_PROTOCOL = process.env.IPTV_PROTOCOL || 'http';

// VPS Config (HLS proxy)
const VPS_STREAM_BASE = process.env.VPS_STREAM_URL || 'https://stream.nobarmeriah.com';

// ========================
// CATEGORY CONFIGS
// ========================

// Sphere Tennis Category
const SPHERE_TENNIS_CATEGORIES = [
    { id: '230', name: 'SPORTS - TENNIS', priority: 1 },
];

// Sports TV Category (Category 122)
const SPORTS_TV_CATEGORY = '122';

// Sports TV channels relevant for Tennis
const TENNIS_TV_CHANNELS = [
    { stream_id: 3685, name: 'Tennis Channel UHD', league: 'ATP/WTA' },
    { stream_id: 2386, name: 'Tennis Channel', league: 'ATP/WTA' },
    { stream_id: 3762, name: 'Tennis Channel (SHD)', league: 'ATP/WTA' },
    // ESPN also covers Grand Slams
    { stream_id: 3636, name: 'ESPN UHD', league: 'Grand Slam' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'Grand Slam' },
    { stream_id: 3725, name: 'ESPN (SHD)', league: 'Grand Slam' },
    { stream_id: 2581, name: 'ESPN 2 (SHD)', league: 'Grand Slam' },
];

// ========================
// CACHE
// ========================
let channelCache = { data: null, lastFetch: null, ttl: 5 * 60 * 1000 };

// ========================
// MAIN ENDPOINT
// ========================

const getTennisEvents = async (req, res) => {
    try {
        const [sphereChannels, sportsTVChannels] = await Promise.all([
            fetchSphereChannels(),
            fetchSportsTVChannels()
        ]);

        // Filter active channels (non-empty names)
        const activeChannels = sphereChannels.filter(ch => {
            const cleanName = ch.name.replace(/^TENNIS\s*\d*\s*:\s*/i, '').trim();
            return cleanName.length > 0;
        });

        const emptyChannels = sphereChannels.filter(ch => {
            const cleanName = ch.name.replace(/^TENNIS\s*\d*\s*:\s*/i, '').trim();
            return cleanName.length === 0;
        });

        // Categorize by tournament type
        const atpChannels = activeChannels.filter(ch => {
            const name = ch.name.toLowerCase();
            return name.includes('atp') || name.includes('masters');
        });

        const wtaChannels = activeChannels.filter(ch => {
            const name = ch.name.toLowerCase();
            return name.includes('wta');
        });

        const grandSlamChannels = activeChannels.filter(ch => {
            const name = ch.name.toLowerCase();
            return name.includes('australian open') || name.includes('roland garros') ||
                name.includes('french open') || name.includes('wimbledon') ||
                name.includes('us open');
        });

        res.json({
            success: true,
            sport: 'tennis',
            timestamp: new Date().toISOString(),
            stats: {
                totalSlots: sphereChannels.length,
                activeChannels: activeChannels.length,
                emptySlots: emptyChannels.length,
                atpChannels: atpChannels.length,
                wtaChannels: wtaChannels.length,
                grandSlamChannels: grandSlamChannels.length,
                sportsTVChannels: sportsTVChannels.length
            },
            channels: {
                atp: atpChannels,
                wta: wtaChannels,
                grandSlam: grandSlamChannels,
                all: activeChannels
            },
            sportsTVChannels: sportsTVChannels,
            upcomingTournaments: getUpcomingTournaments()
        });
    } catch (error) {
        console.error('Tennis Events Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========================
// FETCH FUNCTIONS
// ========================

const fetchSphereChannels = async () => {
    const now = Date.now();
    if (channelCache.data && channelCache.lastFetch && (now - channelCache.lastFetch < channelCache.ttl)) {
        return channelCache.data;
    }

    const allChannels = [];

    for (const category of SPHERE_TENNIS_CATEGORIES) {
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
                const channels = response.data.map(ch => ({
                    id: ch.stream_id,
                    name: ch.name || '',
                    category: category.name,
                    league: detectTournament(ch.name),
                    icon: ch.stream_icon || null,
                    provider: 'sphere',
                    priority: category.priority
                }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error('Error fetching Sphere tennis:', err.message);
        }
    }

    // Remove duplicates
    const seen = new Set();
    const unique = allChannels.filter(ch => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
    });

    channelCache.data = unique;
    channelCache.lastFetch = now;

    return unique;
};

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
            const tennisStreamIds = new Set(TENNIS_TV_CHANNELS.map(ch => ch.stream_id));

            const channels = response.data
                .filter(ch => tennisStreamIds.has(ch.stream_id))
                .map(ch => {
                    const predefined = TENNIS_TV_CHANNELS.find(p => p.stream_id === ch.stream_id);
                    return {
                        id: ch.stream_id,
                        name: predefined?.name || ch.name,
                        originalName: ch.name,
                        icon: ch.stream_icon || null,
                        league: predefined?.league || 'Tennis',
                        category: 'Sports TV',
                        type: 'tv_channel',
                        provider: 'sphere'
                    };
                });

            const orderMap = new Map(TENNIS_TV_CHANNELS.map((ch, idx) => [ch.stream_id, idx]));
            channels.sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));

            return channels;
        }

        return [];
    } catch (err) {
        console.error('Error fetching Sports TV:', err.message);
        return [];
    }
};

// ========================
// STREAM INFO ENDPOINT
// ========================

const getStreamInfo = async (req, res) => {
    try {
        const { streamId } = req.params;

        const streamUrl = `${VPS_STREAM_BASE}/hls/sphere_${streamId}.m3u8`;

        const channels = await fetchSphereChannels();
        const sportsTVChannels = await fetchSportsTVChannels();
        const allChannels = [...channels, ...sportsTVChannels];

        let channel = allChannels.find(ch => ch.id === parseInt(streamId));

        if (!channel) {
            channel = {
                id: parseInt(streamId),
                name: `Tennis Stream ${streamId}`,
                category: 'Tennis',
                icon: null,
                provider: 'sphere'
            };
        }

        res.json({
            success: true,
            stream: {
                id: channel.id,
                name: channel.name,
                url: streamUrl,
                category: channel.category,
                icon: channel.icon,
                league: channel.league || 'Tennis',
                type: channel.type || 'event',
                provider: 'sphere'
            }
        });
    } catch (error) {
        console.error('Stream Info Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========================
// HELPER FUNCTIONS
// ========================

const detectTournament = (name) => {
    if (!name) return 'Tennis';
    const lower = name.toLowerCase();
    if (lower.includes('australian open')) return 'Australian Open';
    if (lower.includes('roland garros') || lower.includes('french open')) return 'Roland Garros';
    if (lower.includes('wimbledon')) return 'Wimbledon';
    if (lower.includes('us open')) return 'US Open';
    if (lower.includes('atp finals')) return 'ATP Finals';
    if (lower.includes('atp')) return 'ATP';
    if (lower.includes('wta')) return 'WTA';
    if (lower.includes('masters')) return 'ATP Masters';
    if (lower.includes('davis cup')) return 'Davis Cup';
    if (lower.includes('fed cup') || lower.includes('billie jean')) return 'Billie Jean King Cup';
    return 'Tennis';
};

const getUpcomingTournaments = () => {
    const now = new Date();
    const year = now.getFullYear();

    const tournaments = [
        { name: 'Australian Open', location: 'Melbourne, Australia', date: `${year}-01-13`, type: 'Grand Slam', surface: 'Hard' },
        { name: 'Indian Wells Masters', location: 'Indian Wells, USA', date: `${year}-03-06`, type: 'ATP Masters 1000', surface: 'Hard' },
        { name: 'Miami Open', location: 'Miami, USA', date: `${year}-03-19`, type: 'ATP Masters 1000', surface: 'Hard' },
        { name: 'Monte-Carlo Masters', location: 'Monte Carlo, Monaco', date: `${year}-04-07`, type: 'ATP Masters 1000', surface: 'Clay' },
        { name: 'Madrid Open', location: 'Madrid, Spain', date: `${year}-04-27`, type: 'ATP Masters 1000', surface: 'Clay' },
        { name: 'Italian Open', location: 'Rome, Italy', date: `${year}-05-11`, type: 'ATP Masters 1000', surface: 'Clay' },
        { name: 'Roland Garros', location: 'Paris, France', date: `${year}-05-25`, type: 'Grand Slam', surface: 'Clay' },
        { name: 'Wimbledon', location: 'London, England', date: `${year}-06-30`, type: 'Grand Slam', surface: 'Grass' },
        { name: 'Canadian Open', location: 'Montreal/Toronto, Canada', date: `${year}-08-04`, type: 'ATP Masters 1000', surface: 'Hard' },
        { name: 'Cincinnati Masters', location: 'Cincinnati, USA', date: `${year}-08-11`, type: 'ATP Masters 1000', surface: 'Hard' },
        { name: 'US Open', location: 'New York, USA', date: `${year}-08-25`, type: 'Grand Slam', surface: 'Hard' },
        { name: 'Shanghai Masters', location: 'Shanghai, China', date: `${year}-10-06`, type: 'ATP Masters 1000', surface: 'Hard' },
        { name: 'Paris Masters', location: 'Paris, France', date: `${year}-10-27`, type: 'ATP Masters 1000', surface: 'Hard (Indoor)' },
        { name: 'ATP Finals', location: 'Turin, Italy', date: `${year}-11-09`, type: 'ATP Finals', surface: 'Hard (Indoor)' },
    ];

    return tournaments.map(t => {
        const tournamentDate = new Date(t.date);
        let status = 'UPCOMING';
        if (tournamentDate < now) status = 'FINISHED';
        const diffDays = Math.ceil((tournamentDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 14) status = 'LIVE';

        return { ...t, status };
    });
};

module.exports = {
    getTennisEvents,
    getStreamInfo,
};
