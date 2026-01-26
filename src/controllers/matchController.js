const axios = require('axios');

const IPTV_SERVER = process.env.IPTV_SERVER;
const IPTV_USER = process.env.IPTV_USER;
const IPTV_PASS = process.env.IPTV_PASS;

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        const response = await axios.get(
            `${IPTV_SERVER}/player_api.php?username=${IPTV_USER}&password=${IPTV_PASS}&action=get_live_categories`
        );

        // Filter sports categories only
        const sportsCategories = response.data.filter(cat =>
            cat.category_name.includes('SPORTS') ||
            cat.category_name.includes('Soccer') ||
            cat.category_name.includes('NBA') ||
            cat.category_name.includes('NFL') ||
            cat.category_name.includes('PPV')
        );

        res.json(sportsCategories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Get all matches/channels by category
exports.getAllMatches = async (req, res) => {
    try {
        const categoryId = req.query.category || '171'; // Default: Soccer

        const response = await axios.get(
            `${IPTV_SERVER}/player_api.php?username=${IPTV_USER}&password=${IPTV_PASS}&action=get_live_streams&category_id=${categoryId}`
        );

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
};

// Get match by ID
exports.getMatchById = async (req, res) => {
    try {
        const { id } = req.params;
        const categoryId = req.query.category || '171';

        const response = await axios.get(
            `${IPTV_SERVER}/player_api.php?username=${IPTV_USER}&password=${IPTV_PASS}&action=get_live_streams&category_id=${categoryId}`
        );

        const match = response.data.find(m => m.stream_id.toString() === id);

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Add stream URL
        match.stream_url = `http://${process.env.VPS_IP}/hls/${match.stream_id}.m3u8`;

        res.json(match);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch match' });
    }
};