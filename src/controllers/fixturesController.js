const axios = require('axios');

// API-Football config
const API_FOOTBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

// IPTV config
const IPTV_BASE_URL = process.env.IPTV_SERVER;
const IPTV_USERNAME = process.env.IPTV_USER;
const IPTV_PASSWORD = process.env.IPTV_PASS;

// IPTV Categories for Football
const IPTV_FOOTBALL_CATEGORIES = [
    '1497',  // US| UEFA PPV (Europa League, Conference League, Champions League)
    '952',   // UK| LIVE FOOTBALL PPV
    '921',   // UK| UEFA PPV
    '755',   // UK| EPL PREMIER LEAGUE PPV
];

// ========== TEAM NAME ALIASES ==========
// Format: 'alias' => ['possible', 'names', 'in', 'api']
const TEAM_ALIASES = {
    // Romanian
    'fcsb': ['steaua bucuresti', 'fcsb', 'steaua'],
    'steaua': ['steaua bucuresti', 'fcsb', 'steaua'],

    // Austrian/German
    'rb salzburg': ['red bull salzburg', 'salzburg', 'rb salzburg'],
    'red bull salzburg': ['red bull salzburg', 'salzburg', 'rb salzburg'],
    'salzburg': ['red bull salzburg', 'salzburg', 'rb salzburg'],
    'rb leipzig': ['rasenballsport leipzig', 'rb leipzig', 'leipzig'],

    // Ukrainian
    'dynamo kyiv': ['dynamo kiev', 'dynamo kyiv', 'dinamo kiev', 'dinamo kyiv'],
    'dynamo kiev': ['dynamo kiev', 'dynamo kyiv', 'dinamo kiev', 'dinamo kyiv'],
    'shakhtar': ['shakhtar donetsk', 'shakhtar'],

    // Serbian
    'crvena zvezda': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star'],
    'crvena zvesda': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star'],
    'red star': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda'],

    // Dutch
    'az': ['az alkmaar', 'az'],
    'az alkmaar': ['az alkmaar', 'az'],
    'psv': ['psv eindhoven', 'psv'],
    'ajax': ['ajax amsterdam', 'ajax'],

    // Greek
    'aek athens': ['aek athens fc', 'aek athens', 'aek'],
    'aek': ['aek athens fc', 'aek athens', 'aek'],
    'paok': ['paok thessaloniki', 'paok', 'paok fc'],
    'olympiacos': ['olympiacos piraeus', 'olympiacos', 'olympiakos'],

    // Polish
    'legia': ['legia warsaw', 'legia warszawa', 'legia'],
    'legia warszawa': ['legia warsaw', 'legia warszawa', 'legia'],
    'lech poznan': ['lech poznań', 'lech poznan', 'lech'],
    'jagiellonia': ['jagiellonia bialystok', 'jagiellonia białystok', 'jagiellonia'],

    // Czech
    'sparta prague': ['sparta praha', 'sparta prague', 'sparta'],
    'slavia prague': ['slavia praha', 'slavia prague', 'slavia'],
    'viktoria plzen': ['viktoria plzeň', 'viktoria plzen', 'plzen', 'plzeň'],
    'plzen': ['viktoria plzeň', 'viktoria plzen', 'plzen', 'plzeň'],

    // Irish
    'shamrock rovers': ['shamrock rovers', 'shamrock'],
    'shamrock': ['shamrock rovers', 'shamrock'],

    // Hungarian
    'ferencvaros': ['ferencvarosi tc', 'ferencvaros', 'ferencváros', 'fradi'],

    // Scottish
    'celtic': ['celtic fc', 'celtic glasgow', 'celtic'],
    'rangers': ['rangers fc', 'glasgow rangers', 'rangers'],

    // English
    'nottingham forest': ['nottingham forest', 'nott\'m forest', 'forest'],
    'man united': ['manchester united', 'man utd', 'man united'],
    'man city': ['manchester city', 'man city'],
    'tottenham': ['tottenham hotspur', 'tottenham', 'spurs'],
    'spurs': ['tottenham hotspur', 'tottenham', 'spurs'],

    // Spanish
    'atletico madrid': ['atletico madrid', 'atlético madrid', 'atletico', 'atleti'],
    'athletic bilbao': ['athletic club', 'athletic bilbao', 'athletic'],
    'real sociedad': ['real sociedad', 'la real', 'sociedad'],
    'real betis': ['real betis', 'betis'],
    'rayo vallecano': ['rayo vallecano', 'rayo'],

    // Italian
    'inter': ['inter milan', 'internazionale', 'inter'],
    'inter milan': ['inter milan', 'internazionale', 'inter'],
    'ac milan': ['ac milan', 'milan'],
    'napoli': ['ssc napoli', 'napoli'],
    'roma': ['as roma', 'roma'],
    'as roma': ['as roma', 'roma'],
    'lazio': ['ss lazio', 'lazio'],
    'fiorentina': ['acf fiorentina', 'fiorentina', 'viola'],
    'juventus': ['juventus fc', 'juventus', 'juve'],

    // Portuguese
    'sporting': ['sporting cp', 'sporting lisbon', 'sporting'],
    'benfica': ['sl benfica', 'benfica'],
    'porto': ['fc porto', 'porto'],
    'braga': ['sc braga', 'sporting braga', 'braga'],

    // French
    'psg': ['paris saint-germain', 'paris saint germain', 'psg', 'paris sg'],
    'marseille': ['olympique marseille', 'om', 'marseille'],
    'lyon': ['olympique lyonnais', 'olympique lyon', 'lyon', 'ol'],
    'monaco': ['as monaco', 'monaco'],
    'lille': ['losc lille', 'lille', 'losc'],
    'nice': ['ogc nice', 'nice'],
    'strasbourg': ['rc strasbourg', 'strasbourg'],

    // German
    'bayern': ['bayern munich', 'bayern münchen', 'fc bayern', 'bayern'],
    'dortmund': ['borussia dortmund', 'bvb', 'dortmund'],
    'gladbach': ['borussia mönchengladbach', 'gladbach', 'bmg'],
    'leverkusen': ['bayer leverkusen', 'leverkusen', 'bayer 04'],
    'freiburg': ['sc freiburg', 'freiburg'],
    'mainz': ['mainz 05', 'fsv mainz', 'mainz'],
    'frankfurt': ['eintracht frankfurt', 'frankfurt', 'sge'],
    'stuttgart': ['vfb stuttgart', 'stuttgart'],

    // Belgian
    'club brugge': ['club brugge', 'club bruges', 'brugge'],
    'anderlecht': ['rsc anderlecht', 'anderlecht'],
    'genk': ['krc genk', 'racing genk', 'genk'],

    // Turkish
    'galatasaray': ['galatasaray sk', 'galatasaray', 'gala'],
    'fenerbahce': ['fenerbahçe', 'fenerbahce', 'fener'],
    'besiktas': ['beşiktaş', 'besiktas'],

    // Swedish
    'malmo': ['malmö ff', 'malmo ff', 'malmo', 'malmö'],

    // Danish
    'midtjylland': ['fc midtjylland', 'midtjylland'],
    'copenhagen': ['fc copenhagen', 'fc københavn', 'copenhagen', 'kobenhavn'],

    // Swiss
    'basel': ['fc basel', 'fc basel 1893', 'basel'],
    'young boys': ['bsc young boys', 'young boys', 'yb'],

    // Israeli
    'maccabi tel aviv': ['maccabi tel aviv', 'maccabi ta', 'maccabi tel-aviv'],
    'maccabi haifa': ['maccabi haifa', 'maccabi haifa fc'],

    // Cypriot
    'apoel': ['apoel nicosia', 'apoel fc', 'apoel'],
    'omonia': ['omonia nicosia', 'ac omonia', 'omonia'],
    'aek larnaca': ['aek larnaca', 'aek larnaka'],

    // Norwegian
    'brann': ['sk brann', 'brann', 'brann bergen'],
    'bodo/glimt': ['bodø/glimt', 'bodo glimt', 'bodo/glimt', 'glimt'],

    // Croatian
    'dinamo zagreb': ['gnk dinamo zagreb', 'dinamo zagreb', 'dinamo'],

    // Bulgarian
    'ludogorets': ['ludogorets razgrad', 'ludogorets', 'pfc ludogorets'],

    // Slovenian
    'celje': ['nk celje', 'celje'],

    // Armenian
    'noah': ['fc noah', 'noah'],

    // Icelandic
    'breidablik': ['breiðablik', 'breidablik'],

    // Misc
    'qarabag': ['qarabağ fk', 'qarabag', 'qarabağ'],
    'sk slovan': ['slovan bratislava', 'sk slovan bratislava', 'slovan'],
};

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
        // Fetch from multiple categories in parallel
        const fetchPromises = IPTV_FOOTBALL_CATEGORIES.map(categoryId => {
            const url = `${IPTV_BASE_URL}/player_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}&action=get_live_streams&category_id=${categoryId}`;
            return axios.get(url, { timeout: 10000 }).catch(err => {
                console.error(`Failed to fetch category ${categoryId}:`, err.message);
                return { data: [] };
            });
        });

        const responses = await Promise.all(fetchPromises);

        // Combine all channels from all categories
        let allChannels = [];
        responses.forEach(res => {
            if (res.data && Array.isArray(res.data)) {
                allChannels = [...allChannels, ...res.data];
            }
        });

        // Remove duplicates by stream_id
        const uniqueChannels = allChannels.filter((channel, index, self) =>
            index === self.findIndex(c => c.stream_id === channel.stream_id)
        );

        console.log(`Fetched ${uniqueChannels.length} unique IPTV channels from ${IPTV_FOOTBALL_CATEGORIES.length} categories`);

        iptvCache.data = uniqueChannels;
        iptvCache.lastFetch = now;

        return iptvCache.data;
    } catch (error) {
        console.error('Failed to fetch IPTV channels:', error.message);
        return iptvCache.data || [];
    }
}

// ========== NORMALIZE TEAM NAME ==========
function normalizeTeamName(name) {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[''`]/g, '') // Remove apostrophes
        .replace(/\s*(fc|sc|cf|ac|as|ss|sk|fk|nk|krc|rsc|ogc|losc|gnk|pfc|bsc|vfb|fsv|ssc|acf|sl|rc)\.?\s*/gi, ' ') // Remove common prefixes/suffixes
        .replace(/\s*(united|city|utd|sporting|athletic|club|academy|hotspur|wanderers|rovers)\.?\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ========== GET TEAM ALIASES ==========
function getTeamAliases(teamName) {
    const normalized = normalizeTeamName(teamName);
    const aliases = new Set([normalized, teamName.toLowerCase()]);

    // Check if team has predefined aliases
    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (normalized.includes(key) || key.includes(normalized) || teamName.toLowerCase().includes(key)) {
            values.forEach(v => aliases.add(normalizeTeamName(v)));
        }
    }

    // Add individual words as potential matches (min 4 chars)
    normalized.split(' ').forEach(word => {
        if (word.length >= 4) {
            aliases.add(word);
        }
    });

    return Array.from(aliases);
}

// ========== FUZZY MATCH SCORE ==========
function fuzzyMatchScore(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 100;

    // One contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 90;

    // Check word overlap
    const words1 = s1.split(' ').filter(w => w.length >= 3);
    const words2 = s2.split(' ').filter(w => w.length >= 3);

    let matchedWords = 0;
    for (const w1 of words1) {
        for (const w2 of words2) {
            if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
                matchedWords++;
                break;
            }
        }
    }

    if (matchedWords > 0) {
        return 50 + (matchedWords / Math.max(words1.length, words2.length)) * 40;
    }

    return 0;
}

// ========== MATCH TEAM NAME WITH IPTV ==========
function findIPTVStream(homeTeam, awayTeam, iptvChannels) {
    if (!iptvChannels || !iptvChannels.length) return null;

    // Get all possible aliases for both teams
    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);

    let bestMatch = null;
    let bestScore = 0;

    for (const channel of iptvChannels) {
        const channelName = channel.name.toLowerCase();

        // Skip header channels (starts with #)
        if (channelName.startsWith('#')) continue;

        // Extract team names from channel - multiple formats
        let channelHome = '';
        let channelAway = '';

        // Try UEFA format: "UEFA | XX - TeamA vs TeamB TIME"
        const uefaMatch = channelName.match(/(?:uefa|uel|ucl|uecl)\s*\|?\s*\d*\s*-?\s*(.+?)\s+vs\s+(.+?)\s+\d/i);
        if (uefaMatch) {
            channelHome = uefaMatch[1].trim();
            channelAway = uefaMatch[2].trim();
        } else {
            // Try format: "... : TeamA vs TeamB @ ..."
            const colonMatch = channelName.match(/:\s*(.+?)\s+vs\s+(.+?)\s*(?:@|\/\/|\d)/i);
            if (colonMatch) {
                channelHome = colonMatch[1].trim();
                channelAway = colonMatch[2].trim();
            } else {
                // Try simple format: "TeamA vs TeamB"
                const simpleMatch = channelName.match(/(.+?)\s+vs\s+(.+?)(?:\s+\d|$)/i);
                if (simpleMatch) {
                    channelHome = simpleMatch[1].replace(/^.*[-|]\s*/, '').trim();
                    channelAway = simpleMatch[2].trim();
                } else {
                    continue;
                }
            }
        }

        if (!channelHome || !channelAway) continue;

        // Normalize channel team names
        const channelHomeNorm = normalizeTeamName(channelHome);
        const channelAwayNorm = normalizeTeamName(channelAway);
        const channelHomeAliases = getTeamAliases(channelHome);
        const channelAwayAliases = getTeamAliases(channelAway);

        // Calculate match scores for both possible orderings
        let homeToHomeScore = 0;
        let awayToAwayScore = 0;
        let homeToAwayScore = 0;
        let awayToHomeScore = 0;

        // Check home team against channel home
        for (const ha of homeAliases) {
            for (const cha of channelHomeAliases) {
                const score = fuzzyMatchScore(ha, cha);
                homeToHomeScore = Math.max(homeToHomeScore, score);
            }
        }

        // Check away team against channel away
        for (const aa of awayAliases) {
            for (const caa of channelAwayAliases) {
                const score = fuzzyMatchScore(aa, caa);
                awayToAwayScore = Math.max(awayToAwayScore, score);
            }
        }

        // Check reversed (home vs channel away, away vs channel home)
        for (const ha of homeAliases) {
            for (const caa of channelAwayAliases) {
                const score = fuzzyMatchScore(ha, caa);
                homeToAwayScore = Math.max(homeToAwayScore, score);
            }
        }

        for (const aa of awayAliases) {
            for (const cha of channelHomeAliases) {
                const score = fuzzyMatchScore(aa, cha);
                awayToHomeScore = Math.max(awayToHomeScore, score);
            }
        }

        // Calculate total score (best of normal or reversed order)
        const normalScore = (homeToHomeScore + awayToAwayScore) / 2;
        const reversedScore = (homeToAwayScore + awayToHomeScore) / 2;
        const totalScore = Math.max(normalScore, reversedScore);

        // Only accept if both teams have reasonable match (>= 50 each)
        const minTeamScore = Math.min(
            Math.max(homeToHomeScore, homeToAwayScore),
            Math.max(awayToAwayScore, awayToHomeScore)
        );

        if (totalScore > bestScore && minTeamScore >= 50) {
            bestScore = totalScore;
            bestMatch = {
                stream_id: channel.stream_id,
                channel_name: channel.name,
                match_score: totalScore
            };
        }

        // Perfect match found
        if (bestScore >= 95) break;
    }

    // Return match if score is good enough (>= 60)
    if (bestMatch && bestScore >= 60) {
        return {
            stream_id: bestMatch.stream_id,
            channel_name: bestMatch.channel_name
        };
    }

    return null;
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
            return res.json({ success: true, date: today, count: 0, fixtures: [] });
        }

        // Fetch IPTV channels
        const iptvChannels = await fetchIPTVChannels();
        console.log(`Processing ${allFixtures.length} fixtures against ${iptvChannels.length} IPTV channels`);

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
