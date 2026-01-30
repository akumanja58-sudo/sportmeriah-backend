const axios = require('axios');

// IPTV configuration
const IPTV_SERVER = process.env.IPTV_SERVER;
const IPTV_USER = process.env.IPTV_USER;
const IPTV_PASS = process.env.IPTV_PASS;

// Football IPTV Categories
const FOOTBALL_CATEGORIES = [
    { id: '952', name: 'UK LIVE FOOTBALL PPV', priority: 1 },
    { id: '755', name: 'UK EPL PREMIER LEAGUE PPV', priority: 2 },
    { id: '1865', name: 'UK EPL PREMIER LEAGUE PPV VIP', priority: 2 },
    { id: '921', name: 'UK UEFA PPV', priority: 3 },
    { id: '1497', name: 'US UEFA PPV', priority: 3 },
    { id: '553', name: 'ES M+ LIGA DE CAMPEONES VIP', priority: 3 },
    { id: '870', name: 'ES M+ LALIGA VIP', priority: 4 },
    { id: '552', name: 'ES DAZN LALIGA VIP', priority: 4 },
    { id: '2045', name: 'ES LALIGA+ PPV', priority: 4 },
    { id: '1616', name: 'ES LALIGA+ PPV VIP', priority: 4 },
    { id: '681', name: 'IT SERIE A/B/C', priority: 5 },
    { id: '590', name: 'IT DAZN PPV', priority: 5 },
    { id: '607', name: 'US MLS PPV', priority: 6 },
    { id: '1151', name: 'US MLS PPV VIP', priority: 6 },
    { id: '1882', name: 'US FIFA+ PPV', priority: 7 },
    { id: '573', name: 'US DAZN PPV', priority: 7 },
    { id: '1020', name: 'FR DAZN PPV', priority: 8 },
    { id: '973', name: 'BR DAZN PPV', priority: 8 },
    { id: '1008', name: 'PT DAZN PPV', priority: 8 },
    { id: '547', name: 'ES DAZN PPV', priority: 8 },
];

// Keywords to identify live/actual matches vs headers/placeholders
const EXCLUDE_KEYWORDS = ['#####', '######', 'NO EVENT', 'OFF AIR', 'PLACEHOLDER'];

// Get all football streams
const getFootballStreams = async (req, res) => {
    try {
        const allStreams = [];

        // Fetch streams from all football categories
        for (const category of FOOTBALL_CATEGORIES) {
            try {
                const response = await axios.get(`${IPTV_SERVER}/player_api.php`, {
                    params: {
                        username: IPTV_USER,
                        password: IPTV_PASS,
                        action: 'get_live_streams',
                        category_id: category.id
                    },
                    timeout: 10000
                });

                if (response.data && Array.isArray(response.data)) {
                    const streams = response.data
                        .filter(stream => !isExcluded(stream.name))
                        .map(stream => ({
                            id: stream.stream_id,
                            name: cleanStreamName(stream.name),
                            originalName: stream.name,
                            icon: stream.stream_icon || null,
                            category: {
                                id: category.id,
                                name: category.name,
                                priority: category.priority
                            },
                            epgId: stream.epg_channel_id || null,
                            added: stream.added ? new Date(parseInt(stream.added) * 1000).toISOString() : null,
                            isLive: isLikelyLive(stream.name),
                            streamUrl: null, // Will be generated on frontend
                            hasArchive: stream.tv_archive === 1
                        }));

                    allStreams.push(...streams);
                }
            } catch (categoryError) {
                console.error(`Error fetching category ${category.id}:`, categoryError.message);
                // Continue with other categories
            }
        }

        // Remove duplicates by stream_id
        const uniqueStreams = removeDuplicates(allStreams);

        // Sort: Live first, then by priority, then by name
        uniqueStreams.sort((a, b) => {
            // Live streams first
            if (a.isLive && !b.isLive) return -1;
            if (!a.isLive && b.isLive) return 1;

            // Then by category priority
            if (a.category.priority !== b.category.priority) {
                return a.category.priority - b.category.priority;
            }

            // Then alphabetically
            return a.name.localeCompare(b.name);
        });

        // Separate live and upcoming
        const liveStreams = uniqueStreams.filter(s => s.isLive);
        const otherStreams = uniqueStreams.filter(s => !s.isLive);

        res.json({
            success: true,
            sport: 'football',
            total: uniqueStreams.length,
            liveCount: liveStreams.length,
            categories: FOOTBALL_CATEGORIES.map(c => ({ id: c.id, name: c.name })),
            streams: {
                live: liveStreams,
                all: otherStreams
            }
        });

    } catch (error) {
        console.error('Football Streams Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch football streams',
            message: error.message
        });
    }
};

// Get streams by specific category
const getFootballByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Validate category
        const category = FOOTBALL_CATEGORIES.find(c => c.id === categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        const response = await axios.get(`${IPTV_SERVER}/player_api.php`, {
            params: {
                username: IPTV_USER,
                password: IPTV_PASS,
                action: 'get_live_streams',
                category_id: categoryId
            },
            timeout: 10000
        });

        if (!response.data || !Array.isArray(response.data)) {
            return res.json({
                success: true,
                category,
                total: 0,
                streams: []
            });
        }

        const streams = response.data
            .filter(stream => !isExcluded(stream.name))
            .map(stream => ({
                id: stream.stream_id,
                name: cleanStreamName(stream.name),
                originalName: stream.name,
                icon: stream.stream_icon || null,
                category: {
                    id: category.id,
                    name: category.name
                },
                isLive: isLikelyLive(stream.name),
                hasArchive: stream.tv_archive === 1
            }));

        // Sort: Live first, then alphabetically
        streams.sort((a, b) => {
            if (a.isLive && !b.isLive) return -1;
            if (!a.isLive && b.isLive) return 1;
            return a.name.localeCompare(b.name);
        });

        res.json({
            success: true,
            category,
            total: streams.length,
            liveCount: streams.filter(s => s.isLive).length,
            streams
        });

    } catch (error) {
        console.error('Football Category Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category streams',
            message: error.message
        });
    }
};

// Get single stream info
const getFootballStream = async (req, res) => {
    try {
        const { streamId } = req.params;

        // We need to search through categories to find this stream
        for (const category of FOOTBALL_CATEGORIES) {
            try {
                const response = await axios.get(`${IPTV_SERVER}/player_api.php`, {
                    params: {
                        username: IPTV_USER,
                        password: IPTV_PASS,
                        action: 'get_live_streams',
                        category_id: category.id
                    },
                    timeout: 10000
                });

                if (response.data && Array.isArray(response.data)) {
                    const stream = response.data.find(s => String(s.stream_id) === String(streamId));

                    if (stream) {
                        return res.json({
                            success: true,
                            stream: {
                                id: stream.stream_id,
                                name: cleanStreamName(stream.name),
                                originalName: stream.name,
                                icon: stream.stream_icon || null,
                                category: {
                                    id: category.id,
                                    name: category.name
                                },
                                epgId: stream.epg_channel_id || null,
                                isLive: isLikelyLive(stream.name),
                                hasArchive: stream.tv_archive === 1
                            }
                        });
                    }
                }
            } catch (err) {
                // Continue searching
            }
        }

        res.status(404).json({
            success: false,
            error: 'Stream not found'
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

// Get available categories
const getFootballCategories = async (req, res) => {
    res.json({
        success: true,
        categories: FOOTBALL_CATEGORIES.map(c => ({
            id: c.id,
            name: c.name,
            priority: c.priority
        }))
    });
};

// Helper: Check if stream name should be excluded
const isExcluded = (name) => {
    if (!name) return true;
    const upperName = name.toUpperCase();
    return EXCLUDE_KEYWORDS.some(keyword => upperName.includes(keyword));
};

// Helper: Clean stream name (remove prefixes like "UK: ", quality tags, etc)
const cleanStreamName = (name) => {
    if (!name) return 'Unknown';

    let cleaned = name
        // Remove country prefixes
        .replace(/^[A-Z]{2,3}[\s]*[:|]\s*/i, '')
        // Remove quality suffixes
        .replace(/\s*(HD|FHD|4K|8K|UHD|SD|\d+P)\s*$/i, '')
        .replace(/\s*[\|]\s*(HD|FHD|4K|8K|UHD|SD|\d+P)\s*$/i, '')
        // Remove VIP/EXCLUSIVE tags
        .replace(/\s*(VIP|EXCLUSIVE|PREMIUM)\s*/gi, '')
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned || name;
};

// Helper: Detect if stream is likely live (has match info in name)
const isLikelyLive = (name) => {
    if (!name) return false;
    const upperName = name.toUpperCase();

    // Keywords that indicate a live match
    const liveIndicators = [
        ' VS ', ' V ', ' - ',
        'LIVE', 'MATCH', 'GAME',
        'KICK OFF', 'KICKOFF'
    ];

    // Check for team vs team pattern or live keywords
    const hasLiveIndicator = liveIndicators.some(ind => upperName.includes(ind));

    // Check for date/time patterns (e.g., "| Mon 20:00")
    const hasDateTime = /\|\s*[A-Z]{3}\s*\d{1,2}[:\d]*/.test(upperName);

    return hasLiveIndicator || hasDateTime;
};

// Helper: Remove duplicate streams by ID
const removeDuplicates = (streams) => {
    const seen = new Map();

    return streams.filter(stream => {
        if (seen.has(stream.id)) {
            // Keep the one with higher priority (lower number)
            const existing = seen.get(stream.id);
            if (stream.category.priority < existing.category.priority) {
                seen.set(stream.id, stream);
                return true;
            }
            return false;
        }
        seen.set(stream.id, stream);
        return true;
    });
};

module.exports = {
    getFootballStreams,
    getFootballByCategory,
    getFootballStream,
    getFootballCategories
};
