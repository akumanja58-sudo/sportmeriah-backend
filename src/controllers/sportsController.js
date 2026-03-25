const axios = require('axios');

// ========================
// SPHERE IPTV CONFIG (Multi-Account Ready)
// ========================
const SPHERE_ACCOUNTS = [
    {
        server: process.env.IPTV_SERVER || 's.rocketdns.info',
        port: process.env.IPTV_PORT || '8080',
        user: process.env.IPTV_USER || '5986529',
        pass: process.env.IPTV_PASS || '0044003',
        protocol: process.env.IPTV_PROTOCOL || 'http',
        label: 'sphere-1'
    },
    // Tambah akun baru di sini:
    // {
    //     server: process.env.IPTV_SERVER_2 || 's.rocketdns.info',
    //     port: process.env.IPTV_PORT_2 || '8080',
    //     user: process.env.IPTV_USER_2 || 'xxx',
    //     pass: process.env.IPTV_PASS_2 || 'xxx',
    //     protocol: process.env.IPTV_PROTOCOL_2 || 'http',
    //     label: 'sphere-2'
    // },
];

const PRIMARY = SPHERE_ACCOUNTS[0];

// VPS Config (HLS proxy)
const VPS_STREAM_BASE = process.env.VPS_STREAM_URL || 'https://stream.nobarmeriah.com';

// Sports TV Category (Category 122) - Premium Sports Channels
const SPORTS_TV_CATEGORY = '122';

// ========================
// SPORT DEFINITIONS
// ========================
// Semua sport config di satu tempat — tambahin sport baru tinggal push ke sini
const SPORTS = {
    nhl: {
        name: 'NHL / Ice Hockey',
        slug: 'nhl',
        categories: [
            { id: '137', name: 'USA NHL' },
            { id: '393', name: 'CANADIAN HOCKEY' },
        ],
        channelPrefix: /^USA NHL\s*/i,
        type: 'team',  // per-team channels
        sportsTVChannels: [
            { stream_id: 3636, name: 'ESPN UHD', league: 'NHL' },
            { stream_id: 3637, name: 'ESPN 2 UHD', league: 'NHL' },
            { stream_id: 3725, name: 'ESPN (SHD)', league: 'NHL' },
            { stream_id: 2581, name: 'ESPN 2 (SHD)', league: 'NHL' },
        ],
    },

    mlb: {
        name: 'MLB / Baseball',
        slug: 'mlb',
        categories: [
            { id: '136', name: 'USA MLB' },
            { id: '356', name: 'NCAA BASEBALL' },
        ],
        channelPrefix: /^MLB\s*/i,
        type: 'team',
        sportsTVChannels: [
            { stream_id: 3636, name: 'ESPN UHD', league: 'MLB' },
            { stream_id: 3637, name: 'ESPN 2 UHD', league: 'MLB' },
            { stream_id: 2501, name: 'Fox Sports 1 (SHD)', league: 'MLB' },
            { stream_id: 2500, name: 'Fox Sports 2', league: 'MLB' },
        ],
    },

    nfl: {
        name: 'NFL / American Football',
        slug: 'nfl',
        categories: [
            { id: '134', name: 'USA NFL' },
            { id: '181', name: 'NCAA FOOTBALL' },
        ],
        channelPrefix: /^NFL\s*/i,
        type: 'mixed',  // mix of team channels + event channels
        sportsTVChannels: [
            { stream_id: 3636, name: 'ESPN UHD', league: 'NFL' },
            { stream_id: 3637, name: 'ESPN 2 UHD', league: 'NFL' },
            { stream_id: 3645, name: 'Fox Sports 1 UHD', league: 'NFL' },
            { stream_id: 3621, name: 'CBS Sports Network UHD', league: 'NFL' },
        ],
    },

    cricket: {
        name: 'Cricket',
        slug: 'cricket',
        categories: [
            { id: '231', name: 'SPORTS - CRICKET' },
        ],
        channelPrefix: /^CRICKET\s*\d*\s*:\s*/i,
        type: 'event',  // match-specific channels
        sportsTVChannels: [],
    },

    golf: {
        name: 'Golf',
        slug: 'golf',
        categories: [
            { id: '233', name: 'SPORTS - GOLF' },
        ],
        channelPrefix: /^GOLF\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [
            { stream_id: 50908, name: 'Fubo Sports Network', league: 'Golf' },
        ],
    },

    rugby: {
        name: 'Rugby',
        slug: 'rugby',
        categories: [
            { id: '232', name: 'SPORTS - RUGBY' },
        ],
        channelPrefix: /^Rugby\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    handball: {
        name: 'Handball',
        slug: 'handball',
        categories: [
            { id: '397', name: 'SPORTS - HANDBALL' },
        ],
        channelPrefix: /^HANDBALL\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    volleyball: {
        name: 'Volleyball',
        slug: 'volleyball',
        categories: [
            { id: '396', name: 'SPORTS - VOLLEY BALL' },
        ],
        channelPrefix: /^VOLLEY\s*BALL\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    ppv: {
        name: 'PPV Events (Boxing, MMA, UFC)',
        slug: 'ppv',
        categories: [
            { id: '130', name: 'PAY PER VIEW (PPV)' },
        ],
        channelPrefix: /^USA PPV\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    mls: {
        name: 'MLS',
        slug: 'mls',
        categories: [
            { id: '359', name: 'SPORTS - MLS' },
        ],
        channelPrefix: /^MLS\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    wnba: {
        name: 'WNBA',
        slug: 'wnba',
        categories: [
            { id: '388', name: 'SPORTS - WNBA' },
        ],
        channelPrefix: /^WNBA\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    lacrosse: {
        name: 'Lacrosse',
        slug: 'lacrosse',
        categories: [
            { id: '400', name: 'SPORTS - LACROSSE' },
        ],
        channelPrefix: /^LACROSSE\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    espn_plus: {
        name: 'ESPN+ Events',
        slug: 'espn_plus',
        categories: [
            { id: '138', name: 'SPORTS - ESPN+' },
        ],
        channelPrefix: /^ESPN\+?\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },

    ncaa_basketball: {
        name: 'NCAA Basketball',
        slug: 'ncaa_basketball',
        categories: [
            { id: '242', name: 'NCAA MEN\'s BASKETBALL' },
            { id: '243', name: 'NCAA WOMEN\'s BASKETBALL' },
        ],
        channelPrefix: /^NCAA\s*(M|W)?\s*BB\s*\d*\s*:\s*/i,
        type: 'event',
        sportsTVChannels: [],
    },
};

// ========================
// CACHE (per sport)
// ========================
const caches = {};

function getCache(sport) {
    if (!caches[sport]) {
        caches[sport] = { data: null, lastFetch: null, ttl: 5 * 60 * 1000 };
    }
    return caches[sport];
}

// ========================
// FETCH SPHERE CHANNELS (Generic)
// ========================
async function fetchSphereChannels(sportConfig, account) {
    const acc = account || PRIMARY;
    const cache = getCache(sportConfig.slug);
    const now = Date.now();

    if (acc === PRIMARY && cache.data && cache.lastFetch && (now - cache.lastFetch < cache.ttl)) {
        return cache.data;
    }

    const allChannels = [];

    for (const category of sportConfig.categories) {
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
                    .filter(ch => !isExcludedChannel(ch.name))
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name || '',
                        cleanName: cleanChannelName(ch.name, sportConfig.channelPrefix),
                        category: category.name,
                        icon: ch.stream_icon || null,
                        provider: 'sphere'
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`[Sphere/${acc.label}] Error fetching ${sportConfig.slug} cat ${category.id}:`, err.message);
        }
    }

    // Remove duplicates
    const seen = new Set();
    const unique = allChannels.filter(ch => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
    });

    if (acc === PRIMARY) {
        cache.data = unique;
        cache.lastFetch = now;
    }

    return unique;
}

// ========================
// FETCH SPORTS TV CHANNELS
// ========================
let sportsTVCache = { data: null, lastFetch: null, ttl: 5 * 60 * 1000 };

async function fetchAllSportsTVChannels() {
    const now = Date.now();

    if (sportsTVCache.data && sportsTVCache.lastFetch && (now - sportsTVCache.lastFetch < sportsTVCache.ttl)) {
        return sportsTVCache.data;
    }

    try {
        const response = await axios.get(`${PRIMARY.protocol}://${PRIMARY.server}:${PRIMARY.port}/player_api.php`, {
            params: {
                username: PRIMARY.user,
                password: PRIMARY.pass,
                action: 'get_live_streams',
                category_id: SPORTS_TV_CATEGORY
            },
            timeout: 10000
        });

        if (response.data && Array.isArray(response.data)) {
            sportsTVCache.data = response.data;
            sportsTVCache.lastFetch = now;
            return response.data;
        }

        return [];
    } catch (err) {
        console.error('Error fetching Sports TV channels:', err.message);
        return sportsTVCache.data || [];
    }
}

async function fetchSportsTVForSport(sportConfig) {
    if (!sportConfig.sportsTVChannels || sportConfig.sportsTVChannels.length === 0) {
        return [];
    }

    const allSportsTV = await fetchAllSportsTVChannels();
    const targetIds = new Set(sportConfig.sportsTVChannels.map(ch => ch.stream_id));

    const channels = allSportsTV
        .filter(ch => targetIds.has(ch.stream_id))
        .map(ch => {
            const predefined = sportConfig.sportsTVChannels.find(p => p.stream_id === ch.stream_id);
            return {
                id: ch.stream_id,
                name: predefined?.name || ch.name,
                originalName: ch.name,
                icon: ch.stream_icon || null,
                league: predefined?.league || sportConfig.name,
                category: 'Sports TV',
                type: 'tv_channel',
                provider: 'sphere'
            };
        });

    const orderMap = new Map(sportConfig.sportsTVChannels.map((ch, idx) => [ch.stream_id, idx]));
    channels.sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));

    return channels;
}

// ========================
// HELPER FUNCTIONS
// ========================

function cleanChannelName(name, prefix) {
    if (!name) return '';
    let clean = name;
    if (prefix) {
        clean = clean.replace(prefix, '');
    }
    // Remove time suffix like "@ 12:00 PM EDT"
    clean = clean.replace(/\s*@\s*[\d:]+\s*(AM|PM)?\s*(EST|EDT|CST|CDT|MST|MDT|PST|PDT)?.*$/i, '');
    return clean.trim();
}

function isExcludedChannel(name) {
    if (!name) return false;
    const excludePatterns = [
        /test/i,
        /backup/i,
        /offline/i,
        /\[.*\]/,
    ];
    return excludePatterns.some(pattern => pattern.test(name));
}

function parseMatchFromChannel(name) {
    if (!name) return null;

    // Pattern: "Team vs. Team" or "Team vs Team"
    const vsMatch = name.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s*@|\s*\d{1,2}:\d{2}|$)/i);
    if (vsMatch) {
        return {
            homeTeam: vsMatch[1].trim(),
            awayTeam: vsMatch[2].trim()
        };
    }

    return null;
}

// ========================
// GENERIC SPORT ENDPOINT
// ========================
async function getSportEvents(sportSlug, req, res) {
    const sportConfig = SPORTS[sportSlug];

    if (!sportConfig) {
        return res.status(404).json({
            success: false,
            error: `Sport '${sportSlug}' not found`,
            available: Object.keys(SPORTS)
        });
    }

    try {
        const [channels, sportsTVChannels] = await Promise.all([
            fetchSphereChannels(sportConfig),
            fetchSportsTVForSport(sportConfig)
        ]);

        // Separate active vs empty channels
        const activeChannels = channels.filter(ch => ch.cleanName.length > 0);
        const emptySlots = channels.filter(ch => ch.cleanName.length === 0);

        // Try to parse matches from active channels
        const matchChannels = [];
        const otherChannels = [];

        for (const ch of activeChannels) {
            const match = parseMatchFromChannel(ch.cleanName);
            if (match) {
                matchChannels.push({
                    ...ch,
                    match: match
                });
            } else {
                otherChannels.push(ch);
            }
        }

        res.json({
            success: true,
            sport: sportConfig.slug,
            sportName: sportConfig.name,
            timestamp: new Date().toISOString(),
            stats: {
                totalSlots: channels.length,
                activeChannels: activeChannels.length,
                emptySlots: emptySlots.length,
                matchChannels: matchChannels.length,
                otherChannels: otherChannels.length,
                sportsTVChannels: sportsTVChannels.length
            },
            channels: {
                matches: matchChannels,
                other: otherChannels,
                all: activeChannels
            },
            sportsTVChannels: sportsTVChannels
        });

    } catch (error) {
        console.error(`${sportConfig.name} Events Error:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ========================
// STREAM INFO (Generic)
// ========================
async function getStreamInfo(sportSlug, req, res) {
    const sportConfig = SPORTS[sportSlug];
    const { streamId } = req.params;

    try {
        const streamUrl = `${VPS_STREAM_BASE}/hls/sphere_${streamId}.m3u8`;

        let channel = null;

        if (sportConfig) {
            const channels = await fetchSphereChannels(sportConfig);
            const sportsTVChannels = await fetchSportsTVForSport(sportConfig);
            const allChannels = [...channels, ...sportsTVChannels];
            channel = allChannels.find(ch => ch.id === parseInt(streamId));
        }

        if (!channel) {
            channel = {
                id: parseInt(streamId),
                name: `Stream ${streamId}`,
                category: sportConfig?.name || 'Sports',
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
                league: channel.league || sportConfig?.name || 'Sports',
                type: channel.type || 'event',
                provider: 'sphere'
            }
        });

    } catch (error) {
        console.error('Stream Info Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ========================
// LIST ALL AVAILABLE SPORTS
// ========================
async function getAllSports(req, res) {
    try {
        // Fetch channel counts for each sport in parallel
        const sportEntries = Object.entries(SPORTS);

        const results = await Promise.all(
            sportEntries.map(async ([slug, config]) => {
                try {
                    const channels = await fetchSphereChannels(config);
                    const active = channels.filter(ch => ch.cleanName.length > 0);
                    return {
                        slug: slug,
                        name: config.name,
                        type: config.type,
                        totalSlots: channels.length,
                        activeChannels: active.length,
                        categories: config.categories.map(c => c.name),
                        endpoint: `/api/sports/${slug}`
                    };
                } catch (err) {
                    return {
                        slug: slug,
                        name: config.name,
                        type: config.type,
                        totalSlots: 0,
                        activeChannels: 0,
                        categories: config.categories.map(c => c.name),
                        endpoint: `/api/sports/${slug}`,
                        error: err.message
                    };
                }
            })
        );

        // Sort: active channels first, then alphabetically
        results.sort((a, b) => {
            if (b.activeChannels !== a.activeChannels) return b.activeChannels - a.activeChannels;
            return a.name.localeCompare(b.name);
        });

        const totalActive = results.reduce((sum, r) => sum + r.activeChannels, 0);
        const totalSlots = results.reduce((sum, r) => sum + r.totalSlots, 0);

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                totalSports: results.length,
                totalSlots: totalSlots,
                totalActiveChannels: totalActive
            },
            sports: results
        });

    } catch (error) {
        console.error('All Sports Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ========================
// ROUTE HANDLER FACTORIES
// ========================
// These create Express handlers for each sport

function createSportHandler(sportSlug) {
    return (req, res) => getSportEvents(sportSlug, req, res);
}

function createStreamHandler(sportSlug) {
    return (req, res) => getStreamInfo(sportSlug, req, res);
}

// ========================
// EXPORTS
// ========================
module.exports = {
    SPORTS,
    getAllSports,
    createSportHandler,
    createStreamHandler,
    // Direct access for custom routes
    getSportEvents,
    getStreamInfo,
};
