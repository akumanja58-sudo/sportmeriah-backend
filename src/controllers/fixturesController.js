const axios = require('axios');

// API-Football config
const API_FOOTBALL_KEY = process.env.FOOTBALL_API_KEY;
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

// IPTV config - SphereIPTV
const IPTV_BASE_URL = process.env.IPTV_SERVER;
const IPTV_USERNAME = process.env.IPTV_USER;
const IPTV_PASSWORD = process.env.IPTV_PASS;

// IPTV config - PearlIPTV (fallback provider)
const PEARL_SERVER = process.env.PEARL_SERVER || 'pearlhost2.one';
const PEARL_USER = process.env.PEARL_USER || 'pearliptv629';
const PEARL_PASS = process.env.PEARL_PASS || '6sa363brvr';
const PEARL_PORT = process.env.PEARL_PORT || '80';

// VPS Config
const VPS_IP = process.env.VPS_IP || '173.249.27.15';

// IPTV Categories for Football
const IPTV_FOOTBALL_CATEGORIES = [
    // UEFA Competitions
    '1497',  // US| UEFA PPV (Europa League, Conference League, Champions League)
    '921',   // UK| UEFA PPV

    // Premier League
    '755',   // UK| EPL PREMIER LEAGUE PPV
    '1865',  // UK| EPL PREMIER LEAGUE PPV VIP
    '952',   // UK| LIVE FOOTBALL PPV

    // La Liga (Spain)
    '870',   // ES| M+ LALIGA VIP
    '552',   // ES| DAZN LALIGA VIP
    '1616',  // ES| LALIGA+ PPV VIP
    '2045',  // ES| LALIGA+ PPV

    // Serie A (Italy)
    '977',   // UK| SERIE A TEAM PPV
    '681',   // IT| SERIE A/B/C
    '590',   // IT| DAZN PPV

    // Bundesliga (Germany)
    '1137',  // DE| BUNDESLIGA HD/4K
    '2018',  // DE| LEAGUES FOOTBALL PPV

    // Ligue 1 (France)
    '1614',  // UK| LIGUE 1 PPV
    '1952',  // FR| LIGUE1+ VIP RAW
    '1954',  // FR| LIGUE1+

    // Other Leagues
    '769',   // UK| CHAMPIONSHIP PPV
    '766',   // UK| LEAGUE ONE PPV
    '767',   // UK| LEAGUE TWO PPV
    '930',   // UK| SPFL/SCOTTISH PPV
    '607',   // US| MLS PPV
    '1151',  // US| MLS PPV VIP
    '1882',  // US| FIFA+ PPV
    '976',   // UK| LA LIGA TEAM PPV
    '975',   // UK| HUB PREMIER PPV
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
    'feyenoord': ['feyenoord rotterdam', 'feyenoord'],
    'twente': ['fc twente', 'twente'],

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
    'hearts': ['heart of midlothian', 'hearts', 'heart'],
    'hibs': ['hibernian', 'hibs', 'hibernian fc'],
    'aberdeen': ['aberdeen fc', 'aberdeen'],

    // English - Premier League
    'nottingham forest': ['nottingham forest', 'nottm forest', 'forest', 'nottingham'],
    'nottingham': ['nottingham forest', 'nottm forest', 'forest'],
    'man united': ['manchester united', 'man utd', 'man united', 'manchester utd'],
    'manchester united': ['manchester united', 'man utd', 'man united'],
    'man city': ['manchester city', 'man city'],
    'manchester city': ['manchester city', 'man city'],
    'tottenham': ['tottenham hotspur', 'tottenham', 'spurs'],
    'spurs': ['tottenham hotspur', 'tottenham', 'spurs'],
    'aston villa': ['aston villa', 'villa'],
    'arsenal': ['arsenal fc', 'arsenal'],
    'chelsea': ['chelsea fc', 'chelsea'],
    'liverpool': ['liverpool fc', 'liverpool'],
    'newcastle': ['newcastle united', 'newcastle', 'newcastle utd'],
    'west ham': ['west ham united', 'west ham', 'west ham utd'],
    'brighton': ['brighton & hove albion', 'brighton', 'brighton hove albion'],
    'wolves': ['wolverhampton wanderers', 'wolves', 'wolverhampton'],
    'bournemouth': ['afc bournemouth', 'bournemouth'],
    'fulham': ['fulham fc', 'fulham'],
    'crystal palace': ['crystal palace fc', 'crystal palace', 'palace'],
    'brentford': ['brentford fc', 'brentford'],
    'everton': ['everton fc', 'everton'],
    'leicester': ['leicester city', 'leicester'],
    'ipswich': ['ipswich town', 'ipswich'],
    'southampton': ['southampton fc', 'southampton'],

    // English - Championship
    'leeds': ['leeds united', 'leeds', 'leeds utd'],
    'burnley': ['burnley fc', 'burnley'],
    'sheffield utd': ['sheffield united', 'sheffield utd', 'sheff utd'],
    'sunderland': ['sunderland afc', 'sunderland'],
    'middlesbrough': ['middlesbrough fc', 'middlesbrough', 'boro'],
    'west brom': ['west bromwich albion', 'west brom', 'wba'],
    'norwich': ['norwich city', 'norwich'],
    'watford': ['watford fc', 'watford'],
    'coventry': ['coventry city', 'coventry'],
    'blackburn': ['blackburn rovers', 'blackburn'],
    'bristol city': ['bristol city fc', 'bristol city'],
    'swansea': ['swansea city', 'swansea'],
    'stoke': ['stoke city', 'stoke'],
    'hull': ['hull city', 'hull'],
    'qpr': ['queens park rangers', 'qpr'],
    'millwall': ['millwall fc', 'millwall'],
    'cardiff': ['cardiff city', 'cardiff'],
    'preston': ['preston north end', 'preston'],
    'luton': ['luton town', 'luton'],
    'plymouth': ['plymouth argyle', 'plymouth'],
    'derby': ['derby county', 'derby'],
    'portsmouth': ['portsmouth fc', 'portsmouth'],
    'oxford': ['oxford united', 'oxford'],

    // Spanish - La Liga
    'atletico madrid': ['atletico madrid', 'atlético madrid', 'atletico', 'atleti', 'atl madrid'],
    'athletic bilbao': ['athletic club', 'athletic bilbao', 'athletic'],
    'real sociedad': ['real sociedad', 'la real', 'sociedad'],
    'real betis': ['real betis', 'betis'],
    'celta vigo': ['celta vigo', 'celta', 'rc celta', 'celta de vigo'],
    'celta': ['celta vigo', 'celta', 'rc celta', 'celta de vigo'],
    'real madrid': ['real madrid cf', 'real madrid', 'madrid'],
    'barcelona': ['fc barcelona', 'barcelona', 'barca', 'barça'],
    'sevilla': ['sevilla fc', 'sevilla'],
    'villarreal': ['villarreal cf', 'villarreal'],
    'valencia': ['valencia cf', 'valencia'],
    'getafe': ['getafe cf', 'getafe'],
    'osasuna': ['ca osasuna', 'osasuna'],
    'mallorca': ['rcd mallorca', 'mallorca'],
    'rayo vallecano': ['rayo vallecano', 'rayo'],
    'girona': ['girona fc', 'girona'],
    'alaves': ['deportivo alaves', 'alaves', 'alavés'],
    'las palmas': ['ud las palmas', 'las palmas'],
    'espanyol': ['rcd espanyol', 'espanyol'],
    'leganes': ['cd leganes', 'leganes', 'leganés'],
    'valladolid': ['real valladolid', 'valladolid'],

    // Italian - Serie A
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
    'atalanta': ['atalanta bc', 'atalanta'],
    'torino': ['torino fc', 'torino'],
    'udinese': ['udinese calcio', 'udinese'],
    'genoa': ['genoa cfc', 'genoa'],
    'cagliari': ['cagliari calcio', 'cagliari'],
    'parma': ['parma calcio', 'parma'],
    'empoli': ['empoli fc', 'empoli'],
    'como': ['como 1907', 'como'],
    'verona': ['hellas verona', 'verona'],
    'lecce': ['us lecce', 'lecce'],
    'monza': ['ac monza', 'monza'],
    'venezia': ['venezia fc', 'venezia'],

    // German - Bundesliga
    'bayern': ['bayern munich', 'bayern münchen', 'fc bayern', 'bayern'],
    'bayern munich': ['bayern munich', 'bayern münchen', 'fc bayern', 'bayern'],
    'dortmund': ['borussia dortmund', 'bvb', 'dortmund'],
    'borussia dortmund': ['borussia dortmund', 'bvb', 'dortmund'],
    'leverkusen': ['bayer leverkusen', 'leverkusen', 'bayer 04'],
    'bayer leverkusen': ['bayer leverkusen', 'leverkusen', 'bayer 04'],
    'freiburg': ['sc freiburg', 'freiburg'],
    'frankfurt': ['eintracht frankfurt', 'frankfurt', 'sge'],
    'eintracht frankfurt': ['eintracht frankfurt', 'frankfurt', 'sge'],
    'stuttgart': ['vfb stuttgart', 'stuttgart'],
    'wolfsburg': ['vfl wolfsburg', 'wolfsburg'],
    'gladbach': ['borussia monchengladbach', 'gladbach', 'monchengladbach', 'mgladbach'],
    'monchengladbach': ['borussia monchengladbach', 'gladbach', 'monchengladbach'],
    'hoffenheim': ['tsg hoffenheim', 'hoffenheim'],
    'mainz': ['mainz 05', 'mainz'],
    'augsburg': ['fc augsburg', 'augsburg'],
    'werder bremen': ['werder bremen', 'bremen'],
    'bremen': ['werder bremen', 'bremen'],
    'union berlin': ['union berlin', '1 fc union berlin'],
    'bochum': ['vfl bochum', 'bochum'],
    'heidenheim': ['1 fc heidenheim', 'heidenheim'],
    'st pauli': ['fc st pauli', 'st pauli', 'st. pauli'],
    'holstein kiel': ['holstein kiel', 'kiel'],

    // French - Ligue 1
    'psg': ['paris saint-germain', 'paris saint germain', 'psg', 'paris sg', 'paris'],
    'paris saint germain': ['paris saint-germain', 'paris saint germain', 'psg', 'paris sg'],
    'marseille': ['olympique marseille', 'om', 'marseille'],
    'lyon': ['olympique lyonnais', 'olympique lyon', 'lyon', 'ol'],
    'monaco': ['as monaco', 'monaco'],
    'lille': ['losc lille', 'lille', 'losc'],
    'nice': ['ogc nice', 'nice'],
    'lens': ['rc lens', 'lens'],
    'rennes': ['stade rennais', 'rennes'],
    'strasbourg': ['rc strasbourg', 'strasbourg'],
    'nantes': ['fc nantes', 'nantes'],
    'toulouse': ['toulouse fc', 'toulouse'],
    'montpellier': ['montpellier hsc', 'montpellier'],
    'brest': ['stade brest', 'brest'],
    'reims': ['stade reims', 'reims'],
    'le havre': ['le havre ac', 'le havre'],
    'auxerre': ['aj auxerre', 'auxerre'],
    'angers': ['angers sco', 'angers'],
    'st etienne': ['as saint-etienne', 'saint etienne', 'st etienne'],

    // Portuguese
    'sporting': ['sporting cp', 'sporting lisbon', 'sporting'],
    'benfica': ['sl benfica', 'benfica'],
    'porto': ['fc porto', 'porto'],
    'braga': ['sc braga', 'sporting braga', 'braga'],

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
};

// ========== PEARLIPTV CATEGORIES ==========
const PEARL_FOOTBALL_CATEGORIES = [
    { id: '1193', name: 'LA LIGA SPORT', league_id: 140 },
    { id: '1192', name: 'LEAGUES SERIE A', league_id: 135 },
    { id: '1936', name: 'SERIE A (US)', league_id: 135 },
    { id: '2281', name: 'BUNDESLIGA PPV', league_id: 78 },
    { id: '2278', name: 'BUNDESLIGA PPV 2', league_id: 78 },
    { id: '1933', name: 'LIGUE PLUS', league_id: 61 },
    { id: '1796', name: 'DAZN LIGUE 1', league_id: 61 },
    { id: '1677', name: 'UEFA CHAMPIONS LEAGUE (UK)', league_id: 2 },
    { id: '2132', name: 'UEFA CHAMPIONS LEAGUE (CA)', league_id: 2 },
    { id: '1678', name: 'UEFA EUROPA LEAGUE', league_id: 3 },
    { id: '2453', name: 'UEFA EUROPA LEAGUE 2', league_id: 3 },
    { id: '1932', name: 'SAUDI PRO LEAGUE', league_id: 307 },
    { id: '1310', name: 'EPL PREMIER LEAGUE', league_id: 39 },
    { id: '2283', name: 'PREMIER LEAGUE PPV', league_id: 39 },
    { id: '2084', name: 'WORLD FOOTBALL EVENTS', league_id: null },
];

// PearlIPTV La Liga team → stream ID mapping
const PEARL_LA_LIGA_TEAMS = {
    'alaves': 511016, 'deportivo alaves': 511016, 'alavés': 511016,
    'almeria': 511015,
    'athletic bilbao': 511014, 'athletic club': 511014, 'athletic': 511014,
    'atletico madrid': 511013, 'atletico': 511013, 'atlético madrid': 511013, 'atleti': 511013,
    'barcelona': 511012, 'barca': 511012, 'barça': 511012,
    'cadiz': 511011,
    'celta vigo': 511010, 'celta': 511010, 'celta de vigo': 511010,
    'getafe': 511009,
    'girona': 511008,
    'granada': 511007,
    'las palmas': 511006,
    'mallorca': 511005,
    'osasuna': 511004,
    'rayo vallecano': 511003, 'rayo': 511003,
    'real betis': 511002, 'betis': 511002,
    'real madrid': 511001, 'madrid': 511001,
    'real sociedad': 511000, 'la real': 511000, 'sociedad': 511000,
    'sevilla': 510999,
    'valencia': 510998,
    'villarreal': 510997,
    'espanyol': null,
    'leganes': null, 'leganés': null,
    'valladolid': null,
};

// Cache for IPTV channels
let iptvCache = {
    data: null,
    lastFetch: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

// Cache for PearlIPTV channels
let pearlCache = {
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

// ========== FETCH PEARLIPTV CHANNELS ==========
async function fetchPearlIPTVChannels() {
    const now = Date.now();

    if (pearlCache.data && pearlCache.lastFetch && (now - pearlCache.lastFetch < pearlCache.ttl)) {
        return pearlCache.data;
    }

    try {
        const fetchPromises = PEARL_FOOTBALL_CATEGORIES.map(category => {
            const url = `http://${PEARL_SERVER}:${PEARL_PORT}/player_api.php?username=${PEARL_USER}&password=${PEARL_PASS}&action=get_live_streams&category_id=${category.id}`;
            return axios.get(url, { timeout: 10000 }).then(res => ({
                data: res.data,
                category: category
            })).catch(err => {
                console.error(`[Pearl] Failed to fetch category ${category.id}:`, err.message);
                return { data: [], category: category };
            });
        });

        const responses = await Promise.all(fetchPromises);

        let allChannels = [];
        responses.forEach(res => {
            if (res.data && Array.isArray(res.data)) {
                const channels = res.data
                    .filter(ch => ch.name && !ch.name.includes('✦ ✦ ✦'))
                    .map(ch => ({
                        ...ch,
                        _pearl_category: res.category.name,
                        _pearl_league_id: res.category.league_id,
                        _provider: 'pearl'
                    }));
                allChannels = [...allChannels, ...channels];
            }
        });

        const uniqueChannels = allChannels.filter((channel, index, self) =>
            index === self.findIndex(c => c.stream_id === channel.stream_id)
        );

        console.log(`[PearlIPTV] Fetched ${uniqueChannels.length} unique channels from ${PEARL_FOOTBALL_CATEGORIES.length} categories`);

        pearlCache.data = uniqueChannels;
        pearlCache.lastFetch = now;

        return pearlCache.data;
    } catch (error) {
        console.error('[PearlIPTV] Failed to fetch channels:', error.message);
        return pearlCache.data || [];
    }
}

// ========== FIND PEARL STREAM FOR FIXTURE ==========
function findPearlStreamForFixture(fixture) {
    const homeTeam = fixture.teams.home.name;
    const awayTeam = fixture.teams.away.name;
    const leagueId = fixture.league.id;

    // La Liga - use direct team mapping
    if (leagueId === 140) {
        const homeNorm = normalizeTeamName(homeTeam);
        const awayNorm = normalizeTeamName(awayTeam);
        const homeVariations = getTeamVariations(homeTeam);
        const awayVariations = getTeamVariations(awayTeam);

        // Try home team first
        for (const v of homeVariations) {
            if (PEARL_LA_LIGA_TEAMS[v] !== undefined && PEARL_LA_LIGA_TEAMS[v] !== null) {
                return {
                    stream_id: PEARL_LA_LIGA_TEAMS[v],
                    channel_name: `LA LIGA - ${homeTeam}`,
                    provider: 'pearl'
                };
            }
        }

        // Try away team
        for (const v of awayVariations) {
            if (PEARL_LA_LIGA_TEAMS[v] !== undefined && PEARL_LA_LIGA_TEAMS[v] !== null) {
                return {
                    stream_id: PEARL_LA_LIGA_TEAMS[v],
                    channel_name: `LA LIGA - ${awayTeam}`,
                    provider: 'pearl'
                };
            }
        }
    }

    return null;
}

// ========== FIND PEARL STREAM BY CHANNEL MATCHING ==========
function findPearlStreamByChannelMatch(homeTeam, awayTeam, pearlChannels) {
    const homeVariations = getTeamVariations(homeTeam);
    const awayVariations = getTeamVariations(awayTeam);

    for (const channel of pearlChannels) {
        const channelName = channel.name.toLowerCase();

        // Check if channel has both teams (vs format)
        const hasHome = homeVariations.some(v => channelName.includes(v));
        const hasAway = awayVariations.some(v => channelName.includes(v));

        if (hasHome && hasAway) {
            return {
                stream_id: channel.stream_id,
                channel_name: channel.name,
                provider: 'pearl'
            };
        }

        // For per-team channels, match either team
        if (hasHome || hasAway) {
            return {
                stream_id: channel.stream_id,
                channel_name: channel.name,
                provider: 'pearl'
            };
        }
    }

    return null;
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
        // Step 1: Fetch IPTV channels from BOTH providers
        const [iptvChannels, pearlChannels] = await Promise.all([
            fetchIPTVChannels(),
            fetchPearlIPTVChannels()
        ]);
        console.log(`[Step 1] Got ${iptvChannels.length} SphereIPTV channels, ${pearlChannels.length} PearlIPTV channels`);

        // Step 2: Parse teams from SphereIPTV channels
        const parsedStreams = [];
        for (const channel of iptvChannels) {
            const parsed = parseTeamsFromChannel(channel.name);
            if (parsed) {
                parsedStreams.push({
                    stream_id: channel.stream_id,
                    channel_name: channel.name,
                    homeTeam: parsed.homeTeam,
                    awayTeam: parsed.awayTeam,
                    provider: 'sphere'
                });
            }
        }
        console.log(`[Step 2] Parsed ${parsedStreams.length} SphereIPTV streams with team names`);

        // Step 3: Fetch fixtures from API-Football
        const allFixtures = await fetchTodayFixtures();
        console.log(`[Step 3] Got ${allFixtures.length} fixtures from API`);

        // Step 4: Match IPTV streams with fixtures (SphereIPTV first)
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
                        channel_name: stream.channel_name,
                        provider: 'sphere'
                    }
                });

                console.log(`[Match-Sphere] ${stream.homeTeam} vs ${stream.awayTeam} → ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
            }
        }

        // Step 4b: PearlIPTV fallback - find matches not yet matched
        for (const fixture of allFixtures) {
            if (usedFixtureIds.has(fixture.fixture.id)) continue;

            // Try La Liga team mapping first
            const pearlStream = findPearlStreamForFixture(fixture);
            if (pearlStream) {
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
                        stream_id: pearlStream.stream_id,
                        channel_name: pearlStream.channel_name,
                        provider: 'pearl'
                    }
                });
                console.log(`[Match-Pearl-Map] ${fixture.teams.home.name} vs ${fixture.teams.away.name} → ${pearlStream.channel_name}`);
                continue;
            }

            // Try PearlIPTV channel name matching
            const pearlChannelMatch = findPearlStreamByChannelMatch(
                fixture.teams.home.name,
                fixture.teams.away.name,
                pearlChannels
            );
            if (pearlChannelMatch) {
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
                        stream_id: pearlChannelMatch.stream_id,
                        channel_name: pearlChannelMatch.channel_name,
                        provider: 'pearl'
                    }
                });
                console.log(`[Match-Pearl-Ch] ${fixture.teams.home.name} vs ${fixture.teams.away.name} → ${pearlChannelMatch.channel_name}`);
            }
        }

        console.log(`[Step 4] Matched ${matchedFixtures.length} fixtures (Sphere + Pearl fallback)`);

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
        const [iptvChannels, pearlChannels] = await Promise.all([
            fetchIPTVChannels(),
            fetchPearlIPTVChannels()
        ]);

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
                        channel_name: stream.channel_name,
                        provider: 'sphere'
                    }
                });
            }
        }

        // PearlIPTV fallback for live fixtures
        for (const fixture of liveFixtures) {
            if (usedFixtureIds.has(fixture.fixture.id)) continue;

            const pearlStream = findPearlStreamForFixture(fixture);
            const pearlMatch = pearlStream || findPearlStreamByChannelMatch(
                fixture.teams.home.name,
                fixture.teams.away.name,
                pearlChannels
            );

            if (pearlMatch) {
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
                        stream_id: pearlMatch.stream_id,
                        channel_name: pearlMatch.channel_name,
                        provider: 'pearl'
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

        // Find matching stream - SphereIPTV first
        const iptvChannels = await fetchIPTVChannels();
        let matchedStream = null;

        for (const channel of iptvChannels) {
            const parsed = parseTeamsFromChannel(channel.name);
            if (parsed) {
                if ((teamsMatch(parsed.homeTeam, homeTeam) && teamsMatch(parsed.awayTeam, awayTeam)) ||
                    (teamsMatch(parsed.homeTeam, awayTeam) && teamsMatch(parsed.awayTeam, homeTeam))) {
                    matchedStream = {
                        stream_id: channel.stream_id,
                        channel_name: channel.name,
                        provider: 'sphere'
                    };
                    break;
                }
            }
        }

        // PearlIPTV fallback if SphereIPTV didn't match
        if (!matchedStream) {
            // Try La Liga team mapping
            const pearlStream = findPearlStreamForFixture(fixture);
            if (pearlStream) {
                matchedStream = pearlStream;
            } else {
                // Try PearlIPTV channel matching
                const pearlChannels = await fetchPearlIPTVChannels();
                const pearlChannelMatch = findPearlStreamByChannelMatch(homeTeam, awayTeam, pearlChannels);
                if (pearlChannelMatch) {
                    matchedStream = pearlChannelMatch;
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
