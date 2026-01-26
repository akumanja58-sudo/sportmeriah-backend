const axios = require('axios');

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// Get live matches
exports.getLiveMatches = async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/fixtures?live=all`, {
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Football API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch live matches' });
    }
};

// Get today's matches
exports.getTodayMatches = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

        const response = await axios.get(`${API_URL}/fixtures?date=${today}`, {
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Football API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch today matches' });
    }
};

// Get upcoming matches by league
exports.getMatchesByLeague = async (req, res) => {
    try {
        const { leagueId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const response = await axios.get(`${API_URL}/fixtures?league=${leagueId}&date=${today}`, {
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Football API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
};

// Get match by ID
exports.getMatchById = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${API_URL}/fixtures?id=${id}`, {
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Football API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch match' });
    }
};