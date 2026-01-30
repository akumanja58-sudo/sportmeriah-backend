const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// IPTV Config
const IPTV_SERVER = 'cf.business-cdn-8k.ru';
const IPTV_USER = process.env.IPTV_USER || 'd6bc5a36b788';
const IPTV_PASS = process.env.IPTV_PASS || '884f0649bc';

// Browser-like headers
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
};

// ========== PROXY M3U8 PLAYLIST ==========
router.get('/:streamId.m3u8', async (req, res) => {
    const { streamId } = req.params;

    if (!streamId) {
        return res.status(400).json({ error: 'Stream ID required' });
    }

    const iptvUrl = `http://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${streamId}.m3u8`;

    console.log(`[Proxy] Fetching m3u8: ${iptvUrl}`);

    try {
        const response = await fetchWithRedirect(iptvUrl);

        if (response.statusCode !== 200) {
            console.error(`[Proxy] IPTV returned status: ${response.statusCode}`);
            return res.status(response.statusCode).send('Stream not available');
        }

        // Set headers for m3u8
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Collect data and modify URLs
        let data = '';
        response.on('data', chunk => {
            data += chunk.toString();
        });

        response.on('end', () => {
            const proxyBase = `/api/stream/`;

            let modifiedData = data;

            // Process each line
            modifiedData = modifiedData.split('\n').map(line => {
                // Skip comments/tags
                if (line.startsWith('#') || line.trim() === '') {
                    return line;
                }

                // Handle .ts and .m3u8 files
                if (line.includes('.ts') || line.includes('.m3u8')) {
                    let fullUrl;
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith('http')) {
                        // Already absolute URL
                        fullUrl = trimmedLine;
                    } else if (trimmedLine.startsWith('/')) {
                        // Absolute path - use server root
                        fullUrl = `http://${IPTV_SERVER}${trimmedLine}`;
                    } else {
                        // Relative path
                        fullUrl = `http://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${trimmedLine}`;
                    }

                    return `${proxyBase}segment?url=${encodeURIComponent(fullUrl)}`;
                }

                return line;
            }).join('\n');

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

    console.log(`[Proxy] Fetching segment: ${url.substring(0, 80)}...`);

    try {
        const response = await fetchWithRedirect(url);

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

// ========== HELPER: Fetch with redirect ==========
function fetchWithRedirect(url, redirectCount = 0, lastRedirectHost = null) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 10) {
            return reject(new Error('Too many redirects'));
        }

        const isHttps = url.startsWith('https');
        const protocol = isHttps ? https : http;

        // Parse URL to get host for Referer
        let urlHost;
        try {
            urlHost = new URL(url).host;
        } catch (e) {
            urlHost = IPTV_SERVER;
        }

        const requestHeaders = {
            ...BROWSER_HEADERS,
            'Host': urlHost,
            'Origin': `http://${IPTV_SERVER}`,
            'Referer': lastRedirectHost ? `http://${lastRedirectHost}/` : `http://${IPTV_SERVER}/`,
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

                console.log(`[Proxy] Redirect ${response.statusCode} to: ${redirectUrl.substring(0, 80)}...`);
                return fetchWithRedirect(redirectUrl, redirectCount + 1, urlHost)
                    .then(resolve)
                    .catch(reject);
            }
            resolve(response);
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
