const axios = require('axios');

// API Sports configuration (same key covers all sports)
const API_F1_KEY = process.env.FOOTBALL_API_KEY;
const API_F1_URL = 'https://v1.formula-1.api-sports.io';

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

// Sphere Motorsport Categories
const SPHERE_MOTORSPORT_CATEGORIES = [
    { id: '235', name: 'SPORTS - MOTORSPORT', league: 'Motorsport', priority: 1 },
];

// Sports TV Category (Category 122) - Premium Sports Channels
const SPORTS_TV_CATEGORY = '122';

// Sports TV channels relevant for Motorsport
const MOTORSPORT_TV_CHANNELS = [
    // ESPN (F1, MotoGP)
    { stream_id: 3636, name: 'ESPN UHD', league: 'F1/MotoGP' },
    { stream_id: 3637, name: 'ESPN 2 UHD', league: 'F1/MotoGP' },
    { stream_id: 3725, name: 'ESPN (SHD)', league: 'F1/MotoGP' },
    { stream_id: 2581, name: 'ESPN 2 (SHD)', league: 'F1/MotoGP' },
    { stream_id: 2578, name: 'ESPN Deportes (SHD)', league: 'F1' },

    // Fox Sports
    { stream_id: 3645, name: 'Fox Sports 1 UHD', league: 'MotoGP' },
    { stream_id: 3646, name: 'Fox Sports 2 UHD', league: 'MotoGP' },
    { stream_id: 2501, name: 'Fox Sports 1 (SHD)', league: 'MotoGP' },
    { stream_id: 2500, name: 'Fox Sports 2', league: 'MotoGP' },
];

// ========================
// MAIN ENDPOINT
// ========================

const getMotorsportEvents = async (req, res) => {
    try {
        const [sphereChannels, sportsTVChannels, f1Races] = await Promise.all([
            fetchSphereChannels(),
            fetchSportsTVChannels(),
            fetchF1Races()
        ]);

        // Categorize channels
        const f1Channels = sphereChannels.filter(ch => {
            const name = ch.name.toLowerCase();
            return name.includes('formula') || name.includes('f1') || name.includes('formula one');
        });

        const motogpChannels = sphereChannels.filter(ch => {
            const name = ch.name.toLowerCase();
            return name.includes('motogp') || name.includes('moto gp') || name.includes('moto2') || name.includes('moto3');
        });

        const otherChannels = sphereChannels.filter(ch => {
            const name = ch.name.toLowerCase();
            return !name.includes('formula') && !name.includes('f1') && !name.includes('formula one') &&
                   !name.includes('motogp') && !name.includes('moto gp') && !name.includes('moto2') && !name.includes('moto3');
        });

        // Filter out empty/placeholder channels
        const activeChannels = sphereChannels.filter(ch => {
            const name = ch.name.trim();
            // Remove channels that end with ":" and nothing else (empty slots)
            const cleanName = name.replace(/^MOTORSPORT\s*\d+\s*:\s*/i, '').trim();
            return cleanName.length > 0;
        });

        const emptyChannels = sphereChannels.filter(ch => {
            const name = ch.name.trim();
            const cleanName = name.replace(/^MOTORSPORT\s*\d+\s*:\s*/i, '').trim();
            return cleanName.length === 0;
        });

        res.json({
            success: true,
            sport: 'motorsport',
            timestamp: new Date().toISOString(),
            stats: {
                totalChannels: sphereChannels.length,
                activeChannels: activeChannels.length,
                emptySlots: emptyChannels.length,
                f1Channels: f1Channels.length,
                motogpChannels: motogpChannels.length,
                sportsTVChannels: sportsTVChannels.length
            },
            channels: {
                f1: f1Channels,
                motogp: motogpChannels,
                other: otherChannels.filter(ch => {
                    const cleanName = ch.name.replace(/^MOTORSPORT\s*\d+\s*:\s*/i, '').trim();
                    return cleanName.length > 0;
                }),
                all: activeChannels
            },
            sportsTVChannels: sportsTVChannels,
            f1Calendar: f1Races
        });
    } catch (error) {
        console.error('Motorsport Events Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ========================
// FETCH FUNCTIONS
// ========================

// Fetch Sphere IPTV channels for motorsport
const fetchSphereChannels = async () => {
    const allChannels = [];

    for (const category of SPHERE_MOTORSPORT_CATEGORIES) {
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
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        league: detectLeague(ch.name),
                        icon: ch.stream_icon || null,
                        provider: 'sphere',
                        priority: category.priority
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching Sphere motorsport:`, err.message);
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
            const motorsportStreamIds = new Set(MOTORSPORT_TV_CHANNELS.map(ch => ch.stream_id));

            const channels = response.data
                .filter(ch => motorsportStreamIds.has(ch.stream_id))
                .map(ch => {
                    const predefined = MOTORSPORT_TV_CHANNELS.find(p => p.stream_id === ch.stream_id);
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

            const orderMap = new Map(MOTORSPORT_TV_CHANNELS.map((ch, idx) => [ch.stream_id, idx]));
            channels.sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));

            return channels;
        }

        return [];
    } catch (err) {
        console.error('Error fetching Sports TV:', err.message);
        return [];
    }
};

// Fetch F1 race calendar from API-Sports
const fetchF1Races = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const response = await axios.get(`${API_F1_URL}/races`, {
            headers: { 'x-apisports-key': API_F1_KEY },
            params: { season: currentYear, type: 'race' },
            timeout: 15000
        });

        if (response.data?.response) {
            const now = new Date();
            return response.data.response.map(race => {
                const raceDate = new Date(race.date);
                let status = 'UPCOMING';
                if (raceDate < now) status = 'FINISHED';
                // If race is today, mark as LIVE
                if (raceDate.toDateString() === now.toDateString()) status = 'LIVE';

                return {
                    id: race.id,
                    name: race.competition?.name || race.name,
                    circuit: race.circuit?.name || null,
                    location: race.competition?.location?.city || null,
                    country: race.competition?.location?.country || null,
                    date: race.date,
                    status: status,
                    season: currentYear,
                    laps: race.laps?.total || null
                };
            }).sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        return [];
    } catch (error) {
        console.error('Error fetching F1 races:', error.message);
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

        // Try to find channel info
        const channels = await fetchSphereChannels();
        const sportsTVChannels = await fetchSportsTVChannels();
        const allChannels = [...channels, ...sportsTVChannels];

        let channel = allChannels.find(ch => ch.id === parseInt(streamId));

        if (!channel) {
            channel = {
                id: parseInt(streamId),
                name: `Motorsport Stream ${streamId}`,
                category: 'Motorsport',
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
                league: channel.league || 'Motorsport',
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

// Detect league from channel name
const detectLeague = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('formula') || lower.includes('f1')) return 'Formula 1';
    if (lower.includes('motogp') || lower.includes('moto gp')) return 'MotoGP';
    if (lower.includes('moto2')) return 'Moto2';
    if (lower.includes('moto3')) return 'Moto3';
    if (lower.includes('f1 academy')) return 'F1 Academy';
    if (lower.includes('nascar')) return 'NASCAR';
    if (lower.includes('indycar')) return 'IndyCar';
    if (lower.includes('wrc') || lower.includes('rally')) return 'WRC';
    if (lower.includes('superbike') || lower.includes('wsbk')) return 'WorldSBK';
    return 'Motorsport';
};

// Parse channel name for clean display
const parseChannelName = (name) => {
    if (!name) return { title: 'Motorsport Live', event: null, league: 'Motorsport' };

    let cleanName = name;

    // Remove prefix like "MOTORSPORT 01: " 
    cleanName = cleanName.replace(/^MOTORSPORT\s*\d*\s*:\s*/i, '');
    
    // Remove time suffix like "@ 12:55 PM"
    cleanName = cleanName.replace(/\s*@\s*[\d:]+\s*(AM|PM)?.*$/i, '');

    const league = detectLeague(name);

    return {
        title: cleanName.trim() || 'Motorsport Live',
        event: cleanName.trim(),
        league: league
    };
};

const isExcludedChannel = (name) => {
    const excludePatterns = [
        /test/i,
        /backup/i,
        /offline/i,
        /\[.*\]/,
    ];
    return excludePatterns.some(pattern => pattern.test(name));
};

module.exports = {
    getMotorsportEvents,
    getStreamInfo,
};
