const axios = require('axios');

const VPS_IP = process.env.VPS_IP || '173.249.27.15';
const VPS_API_URL = process.env.VPS_API_URL || 'http://173.249.27.15:3001';
const VPS_API_KEY = process.env.VPS_API_KEY || 'sportmeriah-secret-key-2026';

// ========================
// PearlIPTV (Bola/Football)
// ========================

// Start Pearl stream
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
            provider: 'pearl',
            account: response.data.account || null
        });
    } catch (error) {
        console.error('Start Pearl stream error:', error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || {};
        res.status(status).json({
            error: data.error || 'Failed to start Pearl stream',
            message: data.message || error.message,
            provider: 'pearl'
        });
    }
};

// Stop Pearl stream
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

// Stop ALL Pearl streams
exports.stopAllPearlStreams = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/pearl/stop-all`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message
        });
    } catch (error) {
        console.error('Stop all Pearl streams error:', error.message);
        res.status(500).json({ error: 'Failed to stop all Pearl streams' });
    }
};

// Get Pearl status - all
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
            running_streams: response.data.running_streams || [],
            available_accounts: response.data.available_accounts,
            max_accounts: response.data.max_accounts
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

// Get specific Pearl stream status
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

// ========================
// SphereIPTV (Basketball, Tennis, Hockey, dll)
// ========================

// Start Sphere stream
exports.startSphereStream = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/sphere/start/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message,
            stream_url: `http://${VPS_IP}/hls/sphere_${id}.m3u8`,
            provider: 'sphere',
            connections: response.data.connections || null
        });
    } catch (error) {
        console.error('Start Sphere stream error:', error.message);
        const status = error.response?.status || 500;
        const data = error.response?.data || {};
        res.status(status).json({
            error: data.error || 'Failed to start Sphere stream',
            message: data.message || error.message,
            provider: 'sphere'
        });
    }
};

// Stop Sphere stream
exports.stopSphereStream = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/sphere/stop/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message,
            provider: 'sphere',
            connections: response.data.connections || null
        });
    } catch (error) {
        console.error('Stop Sphere stream error:', error.message);
        res.status(500).json({ error: 'Failed to stop Sphere stream' });
    }
};

// Stop ALL Sphere streams
exports.stopAllSphereStreams = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/sphere/stop-all`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message
        });
    } catch (error) {
        console.error('Stop all Sphere streams error:', error.message);
        res.status(500).json({ error: 'Failed to stop all Sphere streams' });
    }
};

// Get Sphere status - all
exports.getSphereStatus = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/sphere/status`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            vps_ip: VPS_IP,
            status: 'online',
            provider: 'sphere',
            running_streams: response.data.running_streams || [],
            available_connections: response.data.available_connections,
            max_connections: response.data.max_connections
        });
    } catch (error) {
        console.error('Get Sphere status error:', error.message);
        res.json({
            vps_ip: VPS_IP,
            status: 'offline',
            provider: 'sphere',
            running_streams: []
        });
    }
};

// Get specific Sphere stream status
exports.getSphereStreamStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${VPS_API_URL}/stream/sphere/status/${id}`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            stream_id: id,
            is_running: response.data.is_running,
            stream_url: response.data.is_running ? `http://${VPS_IP}/hls/sphere_${id}.m3u8` : null,
            provider: 'sphere'
        });
    } catch (error) {
        console.error('Get Sphere stream status error:', error.message);
        res.json({
            stream_id: id,
            is_running: false,
            stream_url: null,
            provider: 'sphere'
        });
    }
};

// ========================
// Global (All Providers)
// ========================

// Get global status
exports.getStatus = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/status`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            vps_ip: VPS_IP,
            status: 'online',
            ...response.data
        });
    } catch (error) {
        console.error('Get status error:', error.message);
        res.json({
            vps_ip: VPS_IP,
            status: 'offline',
            total: 0,
            pearl: { streams: [], total: 0 },
            sphere: { streams: [], total: 0 }
        });
    }
};

// Stop all streams (all providers)
exports.stopAllStreams = async (req, res) => {
    try {
        const response = await axios.get(`${VPS_API_URL}/stream/stop-all`, {
            headers: { 'x-api-key': VPS_API_KEY },
            timeout: 10000
        });

        res.json({
            success: true,
            message: response.data.message
        });
    } catch (error) {
        console.error('Stop all streams error:', error.message);
        res.status(500).json({ error: 'Failed to stop all streams' });
    }
};
