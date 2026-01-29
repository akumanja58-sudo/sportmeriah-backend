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
    'crvena zvezda': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star', 'crvena', 'zvezda', 'crvena zvesda'],
    'crvena zvesda': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star', 'crvena', 'zvezda', 'crvena zvesda'],
    'red star': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star'],
    'red star belgrade': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star'],
    'fk crvena zvezda': ['fk crvena zvezda', 'red star belgrade', 'crvena zvezda', 'red star', 'crvena zvesda'],

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
    'panathinaikos': ['panathinaikos fc', 'panathinaikos'],

    // Polish
    'legia': ['legia warsaw', 'legia warszawa', 'legia'],
    'jagiellonia': ['jagiellonia bialystok', 'jagiellonia białystok', 'jagiellonia'],

    // Czech
    'sparta prague': ['sparta praha', 'sparta prague', 'sparta'],
    'slavia prague': ['slavia praha', 'slavia prague', 'slavia'],
    'viktoria plzen': ['viktoria plzeň', 'viktoria plzen', 'plzen', 'plzeň'],
    'plzen': ['viktoria plzeň', 'viktoria plzen', 'plzen', 'plzeň'],

    // Hungarian
    'ferencvaros': ['ferencvarosi tc', 'ferencvaros', 'ferencváros', 'fradi'],
    'ferencvarosi': ['ferencvarosi tc', 'ferencvaros', 'ferencváros', 'fradi'],
    'ferencvarosi tc': ['ferencvarosi tc', 'ferencvaros', 'ferencváros', 'fradi'],

    // Scottish
    'celtic': ['celtic fc', 'celtic glasgow', 'celtic'],
    'rangers': ['rangers fc', 'glasgow rangers', 'rangers'],

    // English
    'nottingham forest': ['nottingham forest', 'nottm forest', 'forest', 'nottingham'],
    'nottingham': ['nottingham forest', 'nottm forest', 'forest'],
    'man united': ['manchester united', 'man utd', 'man united'],
    'manchester united': ['manchester united', 'man utd', 'man united'],
    'man city': ['manchester city', 'man city'],
    'manchester city': ['manchester city', 'man city'],
    'tottenham': ['tottenham hotspur', 'tottenham', 'spurs'],
    'spurs': ['tottenham hotspur', 'tottenham', 'spurs'],
    'aston villa': ['aston villa', 'villa'],

    // Spanish
    'atletico madrid': ['atletico madrid', 'atlético madrid', 'atletico', 'atleti'],
    'athletic bilbao': ['athletic club', 'athletic bilbao', 'athletic'],
    'real sociedad': ['real sociedad', 'la real', 'sociedad'],
    'real betis': ['real betis', 'betis'],
    'celta vigo': ['celta vigo', 'celta', 'rc celta', 'celta de vigo'],
    'celta': ['celta vigo', 'celta', 'rc celta', 'celta de vigo'],

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
    'bologna': ['bologna fc', 'bologna'],

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

    // German
    'bayern': ['bayern munich', 'bayern münchen', 'fc bayern', 'bayern'],
    'dortmund': ['borussia dortmund', 'bvb', 'dortmund'],
    'leverkusen': ['bayer leverkusen', 'leverkusen', 'bayer 04'],
    'freiburg': ['sc freiburg', 'freiburg'],
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
    'malmo ff': ['malmö ff', 'malmo ff', 'malmo', 'malmö'],

    // Danish
    'midtjylland': ['fc midtjylland', 'midtjylland'],
    'fc midtjylland': ['fc midtjylland', 'midtjylland'],
    'copenhagen': ['fc copenhagen', 'fc københavn', 'copenhagen', 'kobenhavn'],

    // Swiss
    'basel': ['fc basel', 'fc basel 1893', 'basel'],
    'young boys': ['bsc young boys', 'young boys', 'yb'],

    // Israeli
    'maccabi tel aviv': ['maccabi tel aviv', 'maccabi ta', 'maccabi tel-aviv'],

    // Norwegian
    'brann': ['sk brann', 'brann', 'brann bergen'],
    'bodo/glimt': ['bodø/glimt', 'bodo glimt', 'bodo/glimt', 'glimt'],
    'bodo glimt': ['bodø/glimt', 'bodo glimt', 'bodo/glimt', 'glimt'],

    // Croatian
    'dinamo zagreb': ['gnk dinamo zagreb', 'dinamo zagreb', 'dinamo'],

    // Bulgarian
    'ludogorets': ['ludogorets razgrad', 'ludogorets', 'pfc ludogorets'],

    // Others
    'qarabag': ['qarabağ fk', 'qarabag', 'qarabağ'],
    'go ahead eagles': ['go ahead eagles', 'go ahead'],
    'sturm graz': ['sturm graz', 'sturm'],
    'utrecht': ['fc utrecht', 'utrecht'],
    'feyenoord': ['feyenoord rotterdam', 'feyenoord'],
};

// Cache for IPTV channels
let iptvCache = {
    data: null,
    lastFetch: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

// Cache for fixtures
let fixturesCache = {
    data: null,
    lastFetch: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

// ========== FETCH IPTV CHANNELS ==========
async function fetchIPTVChannels() {
    const now = Date.now();

    if (iptvCache.data && iptvCache.lastFetch && (now - iptvCache.lastFetch < iptvCache.ttl)) {
        return iptvCache.data;
    }

    try {
        const fetchPromises = IPTV_FOOTBALL_CATEGORIES.map(categoryId => {
            const url = `${IPTV_BASE_URL}/player_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}&action=get_live_streams&category_id=${categoryId}`;
            return axios.get(url, { timeout: 10000 }).catch(err => {
                console.error(`Failed to fetch category ${categoryId}:`, err.message);
                return { data: [] };
            });
        });

        const responses = await Promise.all(fetchPromises);

        let allChannels = [];
        responses.forEach(res => {
            if (res.data && Array.isArray(res.data)) {
                allChannels = [...allChannels, ...res.data];
            }
        });

        const uniqueChannels = allChannels.filter((channel, index, self) =>
            index === self.findIndex(c => c.stream_id === channel.stream_id)
        );

        console.log(`[IPTV] Fetched ${uniqueChannels.length} unique channels from ${IPTV_FOOTBALL_CATEGORIES.length} categories`);

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
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[''`]/g, '')
        .replace(/\s*(fc|sc|cf|ac|as|ss|sk|fk|nk|krc|rsc|ogc|losc|gnk|pfc|bsc|vfb|fsv|ssc|acf|sl|rc)\.?\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ========== GET ALL TEAM VARIATIONS ==========
function getTeamVariations(teamName) {
    const normalized = normalizeTeamName(teamName);
    const variations = new Set([normalized, teamName.toLowerCase()]);

    // Check aliases
    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (normalized.includes(key) || key.includes(normalized) || teamName.toLowerCase().includes(key)) {
            values.forEach(v => variations.add(v.toLowerCase()));
        }
    }

    return Array.from(variations);
}

// ========== PARSE TEAMS FROM IPTV CHANNEL NAME ==========
function parseTeamsFromChannel(channelName) {
    if (!channelName) return null;

    const name = channelName.toLowerCase();

    // Skip header channels
    if (name.startsWith('#') || name.includes('--------')) return null;

    let homeTeam = '';
    let awayTeam = '';

    // Pattern 1: "UEFA | XX - TeamA vs TeamB TIME"
    const uefaMatch = name.match(/(?:uefa|uel|ucl|uecl)\s*\|?\s*\d*\s*-?\s*(.+?)\s+vs\s+(.+?)\s+\d/i);
    if (uefaMatch) {
        homeTeam = uefaMatch[1].trim();
        awayTeam = uefaMatch[2].trim();
    }

    // Pattern 2: "... : TeamA vs TeamB @ ..."
    if (!homeTeam) {
        const colonMatch = name.match(/:\s*(.+?)\s+vs\s+(.+?)\s*(?:@|\/\/|\d)/i);
        if (colonMatch) {
            homeTeam = colonMatch[1].trim();
            awayTeam = colonMatch[2].trim();
        }
    }

    // Pattern 3: "TeamA vs TeamB" (simple)
    if (!homeTeam) {
        const simpleMatch = name.match(/(.+?)\s+vs\s+(.+?)(?:\s+\d|$)/i);
        if (simpleMatch) {
            homeTeam = simpleMatch[1].replace(/^.*[-|]\s*/, '').trim();
            awayTeam = simpleMatch[2].trim();
        }
    }

    if (!homeTeam || !awayTeam) return null;

    // Clean up team names
    homeTeam = homeTeam.replace(/^\d+\s*-?\s*/, '').trim();
    awayTeam = awayTeam.replace(/\s*\d+:\d+.*$/, '').trim();

    return { homeTeam, awayTeam };
}

// ========== CHECK IF TEAMS MATCH ==========
function teamsMatch(iptvTeam, apiTeam) {
    const iptvVariations = getTeamVariations(iptvTeam);
    const apiVariations = getTeamVariations(apiTeam);

    // Check exact match
    for (const iv of iptvVariations) {
        for (const av of apiVariations) {
            if (iv === av) return true;
            // Check if one contains the other (min 5 chars)
            if (iv.length >= 5 && av.length >= 5) {
                if (iv.includes(av) || av.includes(iv)) return true;
            }
        }
    }

    return false;
}

// ========== FETCH TODAY'S FIXTURES FROM API ==========
async function fetchTodayFixtures() {
    const now = Date.now();

    if (fixturesCache.data && fixturesCache.lastFetch && (now - fixturesCache.lastFetch < fixturesCache.ttl)) {
        return fixturesCache.data;
    }

    try {
        const jakartaOffset = 7 * 60 * 60 * 1000;
        const jakartaNow = new Date(Date.now() + jakartaOffset);
        const today = jakartaNow.toISOString().split('T')[0];
        const tomorrow = new Date(jakartaNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [todayResponse, tomorrowResponse] = await Promise.all([
            axios.get(`${API_FOOTBALL_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: { date: today, timezone: 'Asia/Jakarta' }
            }),
            axios.get(`${API_FOOTBALL_URL}/fixtures`, {
                headers: {
                    'x-rapidapi-key': API_FOOTBALL_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                },
                params: { date: tomorrow, timezone: 'Asia/Jakarta' }
            })
        ]);

        const allFixtures = [
            ...(todayResponse.data?.response || []),
            ...(tomorrowResponse.data?.response || [])
        ];

        console.log(`[API-Football] Fetched ${allFixtures.length} fixtures for ${today} and ${tomorrow}`);

        fixturesCache.data = allFixtures;
        fixturesCache.lastFetch = now;

        return fixturesCache.data;
    } catch (error) {
        console.error('Failed to fetch fixtures:', error.message);
        return fixturesCache.data || [];
    }
}

// ========== FIND FIXTURE FOR IPTV STREAM ==========
function findFixtureForStream(iptvHome, iptvAway, fixtures) {
    for (const fixture of fixtures) {
        const apiHome = fixture.teams.home.name;
        const apiAway = fixture.teams.away.name;

        // Check normal order
        if (teamsMatch(iptvHome, apiHome) && teamsMatch(iptvAway, apiAway)) {
            return fixture;
        }

        // Check reversed order
        if (teamsMatch(iptvHome, apiAway) && teamsMatch(iptvAway, apiHome)) {
            return fixture;
        }
    }

    return null;
}

// ========== MAIN: GET TODAY'S FIXTURES (IPTV-FIRST APPROACH) ==========
exports.getTodayFixtures = async (req, res) => {
    try {
        // Step 1: Fetch IPTV channels
        const iptvChannels = await fetchIPTVChannels();
        console.log(`[Step 1] Got ${iptvChannels.length} IPTV channels`);

        // Step 2: Parse teams from IPTV channels
        const parsedStreams = [];
        for (const channel of iptvChannels) {
            const parsed = parseTeamsFromChannel(channel.name);
            if (parsed) {
                parsedStreams.push({
                    stream_id: channel.stream_id,
                    channel_name: channel.name,
                    homeTeam: parsed.homeTeam,
                    awayTeam: parsed.awayTeam
                });
            }
        }
        console.log(`[Step 2] Parsed ${parsedStreams.length} streams with team names`);

        // Step 3: Fetch fixtures from API-Football
        const allFixtures = await fetchTodayFixtures();
        console.log(`[Step 3] Got ${allFixtures.length} fixtures from API`);

        // Step 4: Match IPTV streams with fixtures
        const matchedFixtures = [];
        const usedFixtureIds = new Set();

        for (const stream of parsedStreams) {
            const fixture = findFixtureForStream(stream.homeTeam, stream.awayTeam, allFixtures);

            if (fixture && !usedFixtureIds.has(fixture.fixture.id)) {
                usedFixtureIds.add(fixture.fixture.id);

                matchedFixtures.push({
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
                            name: fixture.teams.home.name,
                            logo: fixture.teams.home.logo
                        },
                        away: {
                            name: fixture.teams.away.name,
                            logo: fixture.teams.away.logo
                        }
                    },
                    goals: {
                        home: fixture.goals.home,
                        away: fixture.goals.away
                    },
                    stream: {
                        stream_id: stream.stream_id,
                        channel_name: stream.channel_name
                    }
                });

                console.log(`[Match] ${stream.homeTeam} vs ${stream.awayTeam} → ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
            }
        }

        console.log(`[Step 4] Matched ${matchedFixtures.length} fixtures with streams`);

        // Step 5: Filter and sort
        const now = Date.now();
        const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
        const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

        const filteredFixtures = matchedFixtures
            .filter(f => {
                const kickoff = f.timestamp * 1000;
                const isLive = liveStatuses.includes(f.status.short);
                const isFinished = finishedStatuses.includes(f.status.short);
                const isUpcoming = f.status.short === 'NS';

                if (isLive) return true;
                if (isFinished) return false;
                if (isUpcoming && kickoff > now) return true;
                return false;
            })
            .sort((a, b) => {
                const aIsLive = liveStatuses.includes(a.status.short);
                const bIsLive = liveStatuses.includes(b.status.short);

                if (aIsLive && !bIsLive) return -1;
                if (!aIsLive && bIsLive) return 1;

                return a.timestamp - b.timestamp;
            });

        const jakartaNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const today = jakartaNow.toISOString().split('T')[0];

        res.json({
            success: true,
            date: today,
            count: filteredFixtures.length,
            fixtures: filteredFixtures
        });

    } catch (error) {
        console.error('Failed to process fixtures:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ========== GET LIVE FIXTURES ONLY ==========
exports.getLiveFixtures = async (req, res) => {
    try {
        // Reuse the main logic but filter for live only
        const iptvChannels = await fetchIPTVChannels();

        const parsedStreams = [];
        for (const channel of iptvChannels) {
            const parsed = parseTeamsFromChannel(channel.name);
            if (parsed) {
                parsedStreams.push({
                    stream_id: channel.stream_id,
                    channel_name: channel.name,
                    homeTeam: parsed.homeTeam,
                    awayTeam: parsed.awayTeam
                });
            }
        }

        // Fetch live fixtures
        const response = await axios.get(`${API_FOOTBALL_URL}/fixtures`, {
            headers: {
                'x-rapidapi-key': API_FOOTBALL_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            },
            params: { live: 'all', timezone: 'Asia/Jakarta' }
        });

        const liveFixtures = response.data?.response || [];

        const matchedFixtures = [];
        const usedFixtureIds = new Set();

        for (const stream of parsedStreams) {
            const fixture = findFixtureForStream(stream.homeTeam, stream.awayTeam, liveFixtures);

            if (fixture && !usedFixtureIds.has(fixture.fixture.id)) {
                usedFixtureIds.add(fixture.fixture.id);

                matchedFixtures.push({
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
                            name: fixture.teams.home.name,
                            logo: fixture.teams.home.logo
                        },
                        away: {
                            name: fixture.teams.away.name,
                            logo: fixture.teams.away.logo
                        }
                    },
                    goals: {
                        home: fixture.goals.home,
                        away: fixture.goals.away
                    },
                    stream: {
                        stream_id: stream.stream_id,
                        channel_name: stream.channel_name
                    }
                });
            }
        }

        res.json({
            success: true,
            count: matchedFixtures.length,
            fixtures: matchedFixtures
        });

    } catch (error) {
        console.error('Failed to fetch live fixtures:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ========== DEBUG: GET IPTV CHANNELS ==========
exports.getIPTVChannels = async (req, res) => {
    try {
        const iptvChannels = await fetchIPTVChannels();

        const parsed = iptvChannels.map(ch => {
            const teams = parseTeamsFromChannel(ch.name);
            return {
                stream_id: ch.stream_id,
                name: ch.name,
                parsed: teams
            };
        });

        const withTeams = parsed.filter(p => p.parsed);
        const withoutTeams = parsed.filter(p => !p.parsed);

        res.json({
            success: true,
            total: iptvChannels.length,
            parsed_count: withTeams.length,
            unparsed_count: withoutTeams.length,
            parsed_streams: withTeams,
            unparsed_streams: withoutTeams.map(p => p.name)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
            params: { id: id, timezone: 'Asia/Jakarta' }
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

        // Find matching stream
        const iptvChannels = await fetchIPTVChannels();
        let matchedStream = null;

        for (const channel of iptvChannels) {
            const parsed = parseTeamsFromChannel(channel.name);
            if (parsed) {
                if ((teamsMatch(parsed.homeTeam, homeTeam) && teamsMatch(parsed.awayTeam, awayTeam)) ||
                    (teamsMatch(parsed.homeTeam, awayTeam) && teamsMatch(parsed.awayTeam, homeTeam))) {
                    matchedStream = {
                        stream_id: channel.stream_id,
                        channel_name: channel.name
                    };
                    break;
                }
            }
        }

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
                stream: matchedStream
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
