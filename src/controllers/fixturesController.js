const axios = require('axios');

// API-Football config
const API_FOOTBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

// IPTV config
const IPTV_BASE_URL = process.env.IPTV_SERVER;
const IPTV_USERNAME = process.env.IPTV_USER;
const IPTV_PASSWORD = process.env.IPTV_PASS;

// Cache for IPTV channels
let iptvCache = {
    data: null,
    lastFetch: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

// ========== FETCH IPTV CHANNELS ==========
async function fetchIPTVChannels() {
    const now = Date.now();
    
    // Return cached if valid
    if (iptvCache.data && iptvCache.lastFetch && (now - iptvCache.lastFetch < iptvCache.ttl)) {
        return iptvCache.data;
    }
    
    try {
        const url = `${IPTV_BASE_URL}/player_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}&action=get_live_streams&category_id=171`;
        const res = await axios.get(url, { timeout: 10000 });
        
        iptvCache.data = res.data || [];
        iptvCache.lastFetch = now;
        
        return iptvCache.data;
    } catch (error) {
        console.error('Failed to fetch IPTV channels:', error.message);
        return iptvCache.data || [];
    }
}

// ========== MATCH TEAM NAME WITH IPTV ==========
function findIPTVStream(homeTeam, awayTeam, iptvChannels) {
    if (!iptvChannels || !iptvChannels.length) return null;
    
    const homeWords = homeTeam.toLowerCase().split(' ').filter(w => w.length >= 3);
    const awayWords = awayTeam.toLowerCase().split(' ').filter(w => w.length >= 3);
    
    for (const channel of iptvChannels) {
        const channelName = channel.name.toLowerCase();
        
        // Check if channel contains both team names (partial match)
        const hasHome = homeWords.some(word => channelName.includes(word));
        const hasAway = awayWords.some(word => channelName.includes(word));
        
        if (hasHome && hasAway) {
            return {
                stream_id: channel.stream_id,
                channel_name: channel.name
            };
        }
    }
    
    return null;
}

// ========== GET TODAY'S FIXTURES ==========
exports.getTodayFixtures = async (req, res) => {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch from API-Football
        const response = await axios.get(`${API_FOOTBALL_URL}/fixtures`, {
            headers: {
                'x-rapidapi-key': API_FOOTBALL_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            },
            params: {
                date: today,
                timezone: 'Asia/Jakarta'
            }
        });
        
        if (!response.data || !response.data.response) {
            return res.json({ success: true, fixtures: [] });
        }
        
        // Fetch IPTV channels
        const iptvChannels = await fetchIPTVChannels();
        
        // Process fixtures
        const fixtures = response.data.response
            .map(fixture => {
                const homeTeam = fixture.teams.home.name;
                const awayTeam = fixture.teams.away.name;
                
                // Find matching IPTV stream
                const iptvStream = findIPTVStream(homeTeam, awayTeam, iptvChannels);
                
                return {
                    id: fixture.fixture.id,
                    date: fixture.fixture.date,
                    timestamp: fixture.fixture.timestamp,
                    status: {
                        short: fixture.fixture.status.short,
                        long: fixture.fixture.status.long,
                        elapsed: fixture.fixture.status.elapsed
                    },
                    league: {
                        id: fixture.league.id,
                        name: fixture.league.name,
                        country: fixture.league.country,
                        logo: fixture.league.logo
                    },
                    teams: {
                        home: {
                            name: homeTeam,
                            logo: fixture.teams.home.logo
                        },
                        away: {
                            name: awayTeam,
                            logo: fixture.teams.away.logo
                        }
                    },
                    goals: {
                        home: fixture.goals.home,
                        away: fixture.goals.away
                    },
                    // IPTV stream info (if found)
                    stream: iptvStream
                };
            })
            // Filter: only show matches with IPTV stream OR popular leagues
            .filter(f => {
                // Always show if has IPTV stream
                if (f.stream) return true;
                
                // Show popular leagues even without stream (for display)
                const popularLeagues = [
                    'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
                    'Champions League', 'Europa League', 'World Cup', 'Euro'
                ];
                return popularLeagues.some(league => 
                    f.league.name.toLowerCase().includes(league.toLowerCase())
                );
            })
            // Sort by status (LIVE first) then by time
            .sort((a, b) => {
                const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'];
                const aIsLive = liveStatuses.includes(a.status.short);
                const bIsLive = liveStatuses.includes(b.status.short);
                
                if (aIsLive && !bIsLive) return -1;
                if (!aIsLive && bIsLive) return 1;
                
                return a.timestamp - b.timestamp;
            });
        
        res.json({
            success: true,
            date: today,
            count: fixtures.length,
            fixtures
        });
        
    } catch (error) {
        console.error('Failed to fetch fixtures:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ========== GET LIVE FIXTURES ONLY ==========
exports.getLiveFixtures = async (req, res) => {
    try {
        // Fetch from API-Football - LIVE only
        const response = await axios.get(`${API_FOOTBALL_URL}/fixtures`, {
            headers: {
                'x-rapidapi-key': API_FOOTBALL_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            },
            params: {
                live: 'all',
                timezone: 'Asia/Jakarta'
            }
        });
        
        if (!response.data || !response.data.response) {
            return res.json({ success: true, fixtures: [] });
        }
        
        // Fetch IPTV channels
        const iptvChannels = await fetchIPTVChannels();
        
        // Process fixtures
        const fixtures = response.data.response.map(fixture => {
            const homeTeam = fixture.teams.home.name;
            const awayTeam = fixture.teams.away.name;
            const iptvStream = findIPTVStream(homeTeam, awayTeam, iptvChannels);
            
            return {
                id: fixture.fixture.id,
                date: fixture.fixture.date,
                timestamp: fixture.fixture.timestamp,
                status: {
                    short: fixture.fixture.status.short,
                    long: fixture.fixture.status.long,
                    elapsed: fixture.fixture.status.elapsed
                },
                league: {
                    id: fixture.league.id,
                    name: fixture.league.name,
                    country: fixture.league.country,
                    logo: fixture.league.logo
                },
                teams: {
                    home: {
                        name: homeTeam,
                        logo: fixture.teams.home.logo
                    },
                    away: {
                        name: awayTeam,
                        logo: fixture.teams.away.logo
                    }
                },
                goals: {
                    home: fixture.goals.home,
                    away: fixture.goals.away
                },
                stream: iptvStream
            };
        });
        
        res.json({
            success: true,
            count: fixtures.length,
            fixtures
        });
        
    } catch (error) {
        console.error('Failed to fetch live fixtures:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ========== GET FIXTURE BY ID ==========
exports.getFixtureById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const response = await axios.get(`${API_FOOTBALL_URL}/fixtures`, {
            headers: {
                'x-rapidapi-key': API_FOOTBALL_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            },
            params: {
                id: id,
                timezone: 'Asia/Jakarta'
            }
        });
        
        if (!response.data || !response.data.response || !response.data.response[0]) {
            return res.status(404).json({
                success: false,
                error: 'Fixture not found'
            });
        }
        
        const fixture = response.data.response[0];
        const homeTeam = fixture.teams.home.name;
        const awayTeam = fixture.teams.away.name;
        
        // Fetch IPTV channels and find stream
        const iptvChannels = await fetchIPTVChannels();
        const iptvStream = findIPTVStream(homeTeam, awayTeam, iptvChannels);
        
        res.json({
            success: true,
            fixture: {
                id: fixture.fixture.id,
                date: fixture.fixture.date,
                timestamp: fixture.fixture.timestamp,
                venue: fixture.fixture.venue,
                status: {
                    short: fixture.fixture.status.short,
                    long: fixture.fixture.status.long,
                    elapsed: fixture.fixture.status.elapsed
                },
                league: {
                    id: fixture.league.id,
                    name: fixture.league.name,
                    country: fixture.league.country,
                    logo: fixture.league.logo,
                    season: fixture.league.season
                },
                teams: {
                    home: {
                        name: homeTeam,
                        logo: fixture.teams.home.logo,
                        winner: fixture.teams.home.winner
                    },
                    away: {
                        name: awayTeam,
                        logo: fixture.teams.away.logo,
                        winner: fixture.teams.away.winner
                    }
                },
                goals: {
                    home: fixture.goals.home,
                    away: fixture.goals.away
                },
                score: fixture.score,
                stream: iptvStream
            }
        });
        
    } catch (error) {
        console.error('Failed to fetch fixture:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
