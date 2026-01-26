const axios = require('axios');
const { exec } = require('child_process');

const VPS_IP = process.env.VPS_IP;
const IPTV_SERVER = process.env.IPTV_SERVER;
const IPTV_USER = process.env.IPTV_USER;
const IPTV_PASS = process.env.IPTV_PASS;

// Note: Untuk production, lo perlu SSH connection ke VPS
// Untuk sekarang, kita return URL aja

// Start stream
exports.startStream = async (req, res) => {
    try {
        const { streamId, name } = req.params;

        // Stream URL dari IPTV
        const sourceUrl = `${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${streamId}.ts`;

        // Output URL (HLS)
        const outputUrl = `http://${VPS_IP}/hls/${name}.m3u8`;

        res.json({
            success: true,
            message: `Stream ${name} started`,
            stream_url: outputUrl,
            source: sourceUrl
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start stream' });
    }
};

// Stop stream
exports.stopStream = async (req, res) => {
    try {
        const { name } = req.params;

        res.json({
            success: true,
            message: `Stream ${name} stopped`
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to stop stream' });
    }
};

// Get stream status
exports.getStatus = async (req, res) => {
    try {
        res.json({
            vps_ip: VPS_IP,
            status: 'online'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
};