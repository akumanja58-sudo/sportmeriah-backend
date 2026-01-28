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

    // Clean team names - remove common suffixes
    const cleanTeamName = (name) => {
        return name
            .toLowerCase()
            .replace(/\s*(fc|sc|cf|united|city|utd|sporting|athletic|club|academy)\.?$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const homeClean = cleanTeamName(homeTeam);
    const awayClean = cleanTeamName(awayTeam);

    // Get significant words (min 3 chars, exclude common words)
    const commonWords = ['the', 'and', 'united', 'city', 'real', 'athletic', 'sporting', 'club', 'football'];
    const getSignificantWords = (name) => {
        return name.split(' ')
            .filter(w => w.length >= 3 && !commonWords.includes(w));
    };

    const homeWords = getSignificantWords(homeClean);
    const awayWords = getSignificantWords(awayClean);

    // Need at least 1 significant word from each team
    if (homeWords.length === 0 || awayWords.length === 0) {
        // Fallback: use full name
        if (homeClean.length >= 3) homeWords.push(homeClean);
        if (awayClean.length >= 3) awayWords.push(awayClean);
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const channel of iptvChannels) {
        const channelName = channel.name.toLowerCase();

        // Skip if channel doesn't contain "vs" (not a match channel)
        if (!channelName.includes(' vs ')) continue;

        // Extract team names from channel (format: "... : TeamA vs TeamB @ ...")
        const vsMatch = channelName.match(/:\s*(.+?)\s+vs\s+(.+?)\s*@/i);
        if (!vsMatch) continue;

        const channelHome = cleanTeamName(vsMatch[1]);
        const channelAway = cleanTeamName(vsMatch[2]);

        // Calculate match score
        let score = 0;

        // Check home team match
        const homeMatchesChannelHome = homeWords.some(word => channelHome.includes(word));
        const homeMatchesChannelAway = homeWords.some(word => channelAway.includes(word));

        // Check away team match
        const awayMatchesChannelHome = awayWords.some(word => channelHome.includes(word));
        const awayMatchesChannelAway = awayWords.some(word => channelAway.includes(word));

        // Best case: home matches channelHome AND away matches channelAway
        if (homeMatchesChannelHome && awayMatchesChannelAway) {
            score = 10;
        }
        // Also good: home matches channelAway AND away matches channelHome (reversed)
        else if (homeMatchesChannelAway && awayMatchesChannelHome) {
            score = 10;
        }
        // Partial match: both teams found but in wrong positions
        else if ((homeMatchesChannelHome || homeMatchesChannelAway) &&
            (awayMatchesChannelHome || awayMatchesChannelAway)) {
            score = 5;
        }

        // Only accept score >= 5 (both teams must match)
        if (score > bestScore) {
            bestScore = score;
            bestMatch = {
                stream_id: channel.stream_id,
                channel_name: channel.name
            };
        }

        // Perfect match found, no need to continue
        if (bestScore >= 10) break;
    }

    return bestMatch;
}

// ========== GET TODAY'S FIXTURES ==========
exports.getTodayFixtures = async (req, res) => {
    try {
        // Get today and tomorrow dates in YYYY-MM-DD format (timezone Jakarta)
        const now = new Date();
        const jakartaOffset = 7 * 60 * 60 * 1000; // UTC+7
        const jakartaNow = new Date(now.getTime() + jakartaOffset);

        const today = jakartaNow.toISOString().split('T')[0];
        const tomorrow = new Date(jakartaNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Fetch from API-Football - both today and tomorrow
        const [todayResponse, tomorrowResponse] = await Promise.all([
            axios.get(`${API_FOOTBALL_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    date: today,
                    timezone: 'Asia/Jakarta'
                }
            }),
            axios.get(`${API_FOOTBALL_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: {
                    date: tomorrow,
                    timezone: 'Asia/Jakarta'
                }
            })
        ]);

        // Combine results
        const allFixtures = [
            ...(todayResponse.data?.response || []),
            ...(tomorrowResponse.data?.response || [])
        ];

        if (!allFixtures.length) {
            return res.json({ success: true, fixtures: [] });
        }

        // Fetch IPTV channels
        const iptvChannels = await fetchIPTVChannels();

        // Process fixtures
        const fixtures = allFixtures
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
            // Filter 1: Hide matches that already passed (except LIVE)
            .filter(f => {
                const now = Date.now();
                const kickoff = f.timestamp * 1000; // Convert to milliseconds
                const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
                const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

                const isLive = liveStatuses.includes(f.status.short);
                const isFinished = finishedStatuses.includes(f.status.short);
                const isUpcoming = f.status.short === 'NS';

                // Always show if LIVE
                if (isLive) return true;

                // Hide if finished
                if (isFinished) return false;

                // Show if Upcoming AND kickoff belum lewat
                if (isUpcoming && kickoff > now) return true;

                // Hide everything else (NS but already passed)
                return false;
            })
            // Filter 2: ONLY show matches with IPTV stream
            .filter(f => f.stream !== null)
            // Sort by status (LIVE first) then by time
            .sort((a, b) => {
                const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'];
                const aIsLive = liveStatuses.includes(a.status.short);
                const bIsLive = liveStatuses.includes(b.status.short);

                if (aIsLive && !bIsLive) return -1;
                if (!aIsLive && bIsLive) return 1;

                return a.timestamp - b.timestamp;
            })
            // Remove duplicates (in case same match appears in both days)
            .filter((fixture, index, self) =>
                index === self.findIndex(f => f.id === fixture.id)
            );

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
