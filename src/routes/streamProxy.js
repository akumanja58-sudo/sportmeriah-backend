const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const axios = require('axios');

// IPTV Config - SphereIPTV
const IPTV_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const IPTV_USER = process.env.IPTV_USER || '8297117';
const IPTV_PASS = process.env.IPTV_PASS || '4501185';
const IPTV_PROTOCOL = process.env.IPTV_PROTOCOL || 'https';

// PearlIPTV Config
const PEARL_SERVER = 'pearlhost2.one';
const PEARL_PORT = '80';
const PEARL_USER = 'pearliptv629';
const PEARL_PASS = '6sa363brvr';

// VPS Config (for FFmpeg restream)
const VPS_URL = 'http://173.249.27.15';

// Browser-like headers
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
};

// ========== PROXY M3U8 PLAYLIST ==========
router.get('/:streamId.m3u8', async (req, res) => {
    const { streamId } = req.params;

    if (!streamId) {
        return res.status(400).json({ error: 'Stream ID required' });
    }

    const iptvUrl = `${IPTV_PROTOCOL}://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${streamId}.m3u8`;

    console.log(`[Proxy] Fetching m3u8: ${iptvUrl}`);

    try {
        // Fetch and follow redirects, get final URL
        const { response, finalUrl } = await fetchWithRedirectAndUrl(iptvUrl);

        if (response.statusCode !== 200) {
            console.error(`[Proxy] IPTV returned status: ${response.statusCode}`);
            return res.status(response.statusCode).send('Stream not available');
        }

        console.log(`[Proxy] Final URL after redirects: ${finalUrl.substring(0, 100)}...`);

        // Set headers for m3u8
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Collect data as buffer first
        const chunks = [];
        response.on('data', chunk => {
            chunks.push(chunk);
        });

        response.on('end', () => {
            // Convert buffer to string
            const data = Buffer.concat(chunks).toString('utf8');

            console.log(`[Proxy] Raw m3u8 length: ${data.length}, first 100 chars: ${data.substring(0, 100)}`);

            // Get base URL from final redirected URL (IPTV server)
            let iptvBaseUrl;
            try {
                const urlObj = new URL(finalUrl);
                iptvBaseUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
                iptvBaseUrl = `${IPTV_PROTOCOL}://${IPTV_SERVER}`;
            }

            // Get our proxy base URL from environment or use default
            const proxyBaseUrl = process.env.BACKEND_URL || 'https://sportmeriah-backend-production.up.railway.app';

            console.log(`[Proxy] IPTV Base URL: ${iptvBaseUrl}`);
            console.log(`[Proxy] Proxy Base URL: ${proxyBaseUrl}`);

            // Replace segment URLs - match /hlsr/ paths (original IPTV format)
            // Only one replacement pass to avoid double-encoding
            let modifiedData = data.replace(/^(\/hlsr\/[^\s\r\n]+\.ts)$/gm, (match, path) => {
                const fullUrl = `${iptvBaseUrl}${path}`;
                return `${proxyBaseUrl}/api/stream/segment?url=${encodeURIComponent(fullUrl)}`;
            });

            console.log(`[Proxy] Modified m3u8 length: ${modifiedData.length}`);

            res.send(modifiedData);
        });

    } catch (error) {
        console.error('[Proxy] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch stream', details: error.message });
    }
});

// ========== PROXY TS SEGMENTS ==========
router.get('/segment', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    console.log(`[Proxy] Fetching segment: ${url.substring(0, 100)}...`);

    try {
        const { response } = await fetchWithRedirectAndUrl(url);

        if (response.statusCode !== 200) {
            console.error(`[Proxy] Segment returned status: ${response.statusCode}`);
            return res.status(response.statusCode).send('Segment not available');
        }

        // Set headers for video segment
        const contentType = response.headers['content-type'] || 'video/mp2t';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Pipe the response directly
        response.pipe(res);

    } catch (error) {
        console.error('[Proxy] Segment error:', error.message);
        res.status(500).json({ error: 'Failed to fetch segment' });
    }
});

// ========== OPTIONS FOR CORS ==========
router.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

// ========== PROXY PEARL M3U8 (VPS Restream) ==========
router.get('/pearl/:streamId.m3u8', async (req, res) => {
    const { streamId } = req.params;

    if (!streamId) {
        return res.status(400).json({ error: 'Stream ID required' });
    }

    // VPS HLS URL (from FFmpeg restream)
    const vpsUrl = `${VPS_URL}/hls/pearl_${streamId}.m3u8`;
    const proxyBaseUrl = process.env.BACKEND_URL || 'https://sportmeriah-backend-production.up.railway.app';

    console.log(`[Pearl Proxy] Fetching m3u8: ${vpsUrl}`);

    try {
        const response = await axios.get(vpsUrl, {
            responseType: 'text',
            timeout: 10000,
            headers: { 'User-Agent': 'SportMeriah/1.0' }
        });

        let m3u8Content = response.data;

        // Rewrite .ts segment URLs to go through our proxy
        // e.g., "pearl_290358_00001.ts" -> "/api/stream/pearl/segment/pearl_290358_00001.ts"
        m3u8Content = m3u8Content.replace(/^(pearl_[0-9]+_[0-9]+\.ts)$/gm,
            `${proxyBaseUrl}/api/stream/pearl/segment/$1`);

        res.set({
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        res.send(m3u8Content);

    } catch (error) {
        console.error('[Pearl Proxy] Error:', error.message);
        res.status(502).json({ error: 'Pearl stream not available', details: error.message });
    }
});

// ========== PROXY PEARL TS SEGMENTS ==========
router.get('/pearl/segment/:filename', async (req, res) => {
    const { filename } = req.params;

    if (!filename) {
        return res.status(400).json({ error: 'Filename required' });
    }

    const vpsUrl = `${VPS_URL}/hls/${filename}`;
    console.log(`[Pearl Proxy] Fetching segment: ${vpsUrl}`);

    try {
        const response = await axios.get(vpsUrl, {
            responseType: 'stream',
            timeout: 30000,
            headers: { 'User-Agent': 'SportMeriah/1.0' }
        });

        res.set({
            'Content-Type': 'video/mp2t',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=2'
        });

        response.data.pipe(res);

    } catch (error) {
        console.error('[Pearl Proxy] Segment error:', error.message);
        res.status(502).json({ error: 'Segment not available' });
    }
});

// ========== PROXY PEARL DIRECT (Alternative - no VPS) ==========
router.get('/pearl-direct/:streamId.m3u8', async (req, res) => {
    const { streamId } = req.params;

    if (!streamId) {
        return res.status(400).json({ error: 'Stream ID required' });
    }

    const pearlUrl = `http://${PEARL_SERVER}:${PEARL_PORT}/live/${PEARL_USER}/${PEARL_PASS}/${streamId}.m3u8`;
    console.log(`[Pearl Direct] Fetching: ${pearlUrl}`);

    try {
        const { response, finalUrl } = await fetchWithRedirectAndUrl(pearlUrl);

        if (response.statusCode !== 200) {
            console.error(`[Pearl Direct] Status: ${response.statusCode}`);
            return res.status(response.statusCode).send('Stream not available');
        }

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
            let data = Buffer.concat(chunks).toString('utf8');

            // Get base URL from final redirected URL
            let baseUrl;
            try {
                const urlObj = new URL(finalUrl);
                baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
                baseUrl = `http://${PEARL_SERVER}:${PEARL_PORT}`;
            }

            const proxyBaseUrl = process.env.BACKEND_URL || 'https://sportmeriah-backend-production.up.railway.app';

            // Rewrite segment URLs
            data = data.replace(/^(\/[^\s\r\n]+\.ts)$/gm, (match, path) => {
                const fullUrl = `${baseUrl}${path}`;
                return `${proxyBaseUrl}/api/stream/segment?url=${encodeURIComponent(fullUrl)}`;
            });

            res.send(data);
        });

    } catch (error) {
        console.error('[Pearl Direct] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Pearl stream' });
    }
});

// ========== HELPER: Fetch with redirect and return final URL ==========
function fetchWithRedirectAndUrl(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 10) {
            return reject(new Error('Too many redirects'));
        }

        const isHttps = url.startsWith('https');
        const protocol = isHttps ? https : http;

        // Parse URL to get host
        let urlHost;
        try {
            urlHost = new URL(url).host;
        } catch (e) {
            urlHost = IPTV_SERVER;
        }

        const requestHeaders = {
            ...BROWSER_HEADERS,
            'Host': urlHost,
        };

        const request = protocol.get(url, {
            headers: requestHeaders,
            timeout: 15000,
        }, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                let redirectUrl = response.headers.location;

                // Handle relative redirects
                if (!redirectUrl.startsWith('http')) {
                    const urlObj = new URL(url);
                    redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
                }

                console.log(`[Proxy] Redirect ${response.statusCode} to: ${redirectUrl.substring(0, 100)}...`);
                return fetchWithRedirectAndUrl(redirectUrl, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
            }

            // Return both response and final URL
            resolve({ response, finalUrl: url });
        });

        request.on('error', (err) => {
            console.error(`[Proxy] Request error: ${err.message}`);
            reject(err);
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

module.exports = router;
