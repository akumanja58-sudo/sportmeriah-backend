const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// IPTV Config
const IPTV_SERVER = 'cf.business-cdn-8k.ru';
const IPTV_USER = process.env.IPTV_USER || 'd6bc5a36b788';
const IPTV_PASS = process.env.IPTV_PASS || '884f0649bc';

// ========== PROXY M3U8 PLAYLIST ==========
router.get('/:streamId.m3u8', async (req, res) => {
    const { streamId } = req.params;
    
    if (!streamId) {
        return res.status(400).json({ error: 'Stream ID required' });
    }

    const iptvUrl = `https://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/${streamId}.m3u8`;
    
    console.log(`[Proxy] Fetching m3u8: ${iptvUrl}`);

    try {
        // Follow redirects manually
        const fetchWithRedirect = (url, redirectCount = 0) => {
            return new Promise((resolve, reject) => {
                if (redirectCount > 5) {
                    return reject(new Error('Too many redirects'));
                }

                const protocol = url.startsWith('https') ? https : http;
                
                const request = protocol.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': `https://${IPTV_SERVER}/`,
                    }
                }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        console.log(`[Proxy] Redirect to: ${response.headers.location}`);
                        return fetchWithRedirect(response.headers.location, redirectCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }
                    resolve(response);
                });

                request.on('error', reject);
                request.setTimeout(10000, () => {
                    request.destroy();
                    reject(new Error('Request timeout'));
                });
            });
        };

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
            // Replace relative URLs with absolute proxy URLs
            // This handles .ts segment files
            const baseUrl = `https://${IPTV_SERVER}/live/${IPTV_USER}/${IPTV_PASS}/`;
            const proxyBase = `/api/stream/`;
            
            // Replace segment URLs to go through our proxy
            let modifiedData = data;
            
            // If there are relative .ts URLs, make them absolute through proxy
            modifiedData = modifiedData.replace(/^(?!#)(.+\.ts.*)$/gm, (match) => {
                if (match.startsWith('http')) {
                    // Already absolute URL - proxy it
                    return `${proxyBase}segment?url=${encodeURIComponent(match)}`;
                } else {
                    // Relative URL
                    return `${proxyBase}segment?url=${encodeURIComponent(baseUrl + match)}`;
                }
            });

            // Also handle any absolute URLs in the playlist
            modifiedData = modifiedData.replace(/(https?:\/\/[^\s]+\.ts[^\s]*)/g, (match) => {
                return `${proxyBase}segment?url=${encodeURIComponent(match)}`;
            });

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
        const fetchWithRedirect = (targetUrl, redirectCount = 0) => {
            return new Promise((resolve, reject) => {
                if (redirectCount > 5) {
                    return reject(new Error('Too many redirects'));
                }

                const protocol = targetUrl.startsWith('https') ? https : http;
                
                const request = protocol.get(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': `https://${IPTV_SERVER}/`,
                    }
                }, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        return fetchWithRedirect(response.headers.location, redirectCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }
                    resolve(response);
                });

                request.on('error', reject);
                request.setTimeout(30000, () => {
                    request.destroy();
                    reject(new Error('Request timeout'));
                });
            });
        };

        const response = await fetchWithRedirect(url);

        if (response.statusCode !== 200) {
            return res.status(response.statusCode).send('Segment not available');
        }

        // Set headers for video segment
        res.setHeader('Content-Type', 'video/mp2t');
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

module.exports = router;
