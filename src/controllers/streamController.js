const axios = require('axios');

const VPS_IP = process.env.VPS_IP || '173.249.27.15';
const VPS_API_URL = process.env.VPS_API_URL || 'http://173.249.27.15:3001';
const VPS_API_KEY = process.env.VPS_API_KEY || 'sportmeriah-secret-key-2026';

// ========================
// SphereIPTV (existing - unchanged)
// ========================

// Start stream
exports.startStream = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/start/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message,
            stream_url: `http://${VPS_IP}/hls/${id}.m3u8`
        });
    } catch (error) {
        console.error('Start stream error:', error.message);
        res.status(500).json({ error: 'Failed to start stream' });
    }
};

// Stop stream
exports.stopStream = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/stop/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message
        });
    } catch (error) {
        console.error('Stop stream error:', error.message);
        res.status(500).json({ error: 'Failed to stop stream' });
    }
};

// Get all streams status
exports.getStatus = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/status`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            vps_ip: VPS_IP,
            status: 'online',
            running_streams: response.data.running_streams || []
        });
    } catch (error) {
        console.error('Get status error:', error.message);
        res.json({
            vps_ip: VPS_IP,
            status: 'offline',
            running_streams: []
        });
    }
};

// Get specific stream status
exports.getStreamStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/status/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            stream_id: id,
            is_running: response.data.is_running,
            stream_url: response.data.is_running ? `http://${VPS_IP}/hls/${id}.m3u8` : null
        });
    } catch (error) {
        console.error('Get stream status error:', error.message);
        res.json({
            stream_id: id,
            is_running: false,
            stream_url: null
        });
    }
};

// ========================
// PearlIPTV (NEW)
// ========================

// Start PearlIPTV stream
exports.startPearlStream = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/pearl/start/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message,
            stream_url: `http://${VPS_IP}/hls/pearl_${id}.m3u8`,
            provider: 'pearl'
        });
    } catch (error) {
        console.error('Start Pearl stream error:', error.message);
        res.status(500).json({ error: 'Failed to start Pearl stream' });
    }
};

// Stop PearlIPTV stream
exports.stopPearlStream = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/pearl/stop/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message,
            provider: 'pearl'
        });
    } catch (error) {
        console.error('Stop Pearl stream error:', error.message);
        res.status(500).json({ error: 'Failed to stop Pearl stream' });
    }
};

// Get PearlIPTV stream status
exports.getPearlStatus = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/pearl/status`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            vps_ip: VPS_IP,
            status: 'online',
            provider: 'pearl',
            running_streams: response.data.running_streams || []
        });
    } catch (error) {
        console.error('Get Pearl status error:', error.message);
        res.json({
            vps_ip: VPS_IP,
            status: 'offline',
            provider: 'pearl',
            running_streams: []
        });
    }
};

// Get specific PearlIPTV stream status
exports.getPearlStreamStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/pearl/status/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            stream_id: id,
            is_running: response.data.is_running,
            stream_url: response.data.is_running ? `http://${VPS_IP}/hls/pearl_${id}.m3u8` : null,
            provider: 'pearl'
        });
    } catch (error) {
        console.error('Get Pearl stream status error:', error.message);
        res.json({
            stream_id: id,
            is_running: false,
            stream_url: null,
            provider: 'pearl'
        });
    }
};
