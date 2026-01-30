const axios = require('axios');

// API Sports configuration
const API_SPORTS_KEY = process.env.FOOTBALL_API_KEY;
const API_SPORTS_URL = 'https://v3.football.api-sports.io';

// IPTV configuration - SphereIPTV
const IPTV_SERVER = process.env.IPTV_SERVER || 's.rocketdns.info';
const IPTV_USER = process.env.IPTV_USER || '8297117';
const IPTV_PASS = process.env.IPTV_PASS || '4501185';
const IPTV_PROTOCOL = process.env.IPTV_PROTOCOL || 'https';

// Football IPTV Categories - SphereIPTV
const FOOTBALL_CATEGORIES = [
    { id: '171', name: 'SPORTS - SOCCER', priority: 1 },
];

// Team name variations for matching
const TEAM_ALIASES = {
    'manchester united': ['man united', 'man utd', 'manchester utd', 'mufc'],
    'manchester city': ['man city', 'mcfc'],
    'tottenham': ['tottenham hotspur', 'spurs'],
    'wolverhampton': ['wolves', 'wolverhampton wanderers'],
    'newcastle': ['newcastle united'],
    'brighton': ['brighton hove albion', 'brighton & hove albion'],
    'west ham': ['west ham united'],
    'nottingham forest': ["nott'm forest", 'nottm forest'],
    'atletico madrid': ['atletico', 'atlético madrid', 'atlético'],
    'real madrid': ['real'],
    'barcelona': ['barca', 'barça'],
    'bayern munich': ['bayern', 'bayern münchen'],
    'borussia dortmund': ['dortmund', 'bvb'],
    'psg': ['paris saint germain', 'paris saint-germain', 'paris sg'],
    'inter': ['inter milan', 'internazionale'],
    'ac milan': ['milan'],
    'rb leipzig': ['leipzig'],
    'deportivo alaves': ['deportivo alavés', 'alaves', 'alavés'],
    'espanyol': ['rcd espanyol'],
    'vitoria guimaraes': ['vitória guimarães', 'guimaraes', 'guimarães'],
    'al nassr': ['al-nassr', 'nassr'],
    'pumas unam': ['pumas', 'unam'],
    'liverpool': ['liverpool fc'],
    'chelsea': ['chelsea fc'],
    'arsenal': ['arsenal fc'],
    'juventus': ['juve'],
    'napoli': ['ssc napoli'],
    'roma': ['as roma'],
    'lazio': ['ss lazio'],
    'sevilla': ['sevilla fc'],
    'villarreal': ['villarreal cf'],
    'real betis': ['betis'],
    'real sociedad': ['sociedad'],
    'athletic bilbao': ['athletic club', 'bilbao'],
    'benfica': ['sl benfica'],
    'porto': ['fc porto'],
    'sporting': ['sporting cp', 'sporting lisbon'],
    'ajax': ['afc ajax'],
    'psv': ['psv eindhoven'],
    'feyenoord': ['feyenoord rotterdam'],
};

// Get all football matches with streams
const getFootballMatches = async (req, res) => {
    try {
        const [fixtures, iptvChannels] = await Promise.all([
            fetchFixtures(),
            fetchIPTVChannels()
        ]);

        // Match fixtures with IPTV channels (STRICT matching)
        const matchedFixtures = matchFixturesWithStreams(fixtures, iptvChannels);

        const liveMatches = matchedFixtures.filter(m => m.status === 'LIVE');
        const upcomingMatches = matchedFixtures.filter(m => m.status === 'UPCOMING');
        const finishedMatches = matchedFixtures.filter(m => m.status === 'FINISHED');

        // Get unmatched IPTV channels
        const matchedStreamIds = new Set(matchedFixtures.filter(m => m.stream).map(m => m.stream.id));
        const unmatchedChannels = iptvChannels
            .filter(ch => !matchedStreamIds.has(ch.id))
            .filter(ch => hasTeamNames(ch.name))
            .map(ch => ({
                ...ch,
                parsedMatch: parseChannelName(ch.name)
            }))
            .slice(0, 50);

        res.json({
            success: true,
            sport: 'football',
            timestamp: new Date().toISOString(),
            stats: {
                total: matchedFixtures.length,
                live: liveMatches.length,
                upcoming: upcomingMatches.length,
                finished: finishedMatches.length,
                withStreams: matchedFixtures.filter(m => m.stream).length
            },
            matches: {
                live: liveMatches,
                upcoming: upcomingMatches,
                finished: finishedMatches.slice(0, 20)
            },
            extraChannels: unmatchedChannels
        });

    } catch (error) {
        console.error('Football Matches Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch football matches',
            message: error.message
        });
    }
};

// Fetch fixtures from API Sports
const fetchFixtures = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const [todayRes, tomorrowRes] = await Promise.all([
            axios.get(`${API_SPORTS_URL}/fixtures`, {
                headers: { 'x-apisports-key': API_SPORTS_KEY },
                params: { date: today },
                timeout: 15000
            }),
            axios.get(`${API_SPORTS_URL}/fixtures`, {
                headers: { 'x-apisports-key': API_SPORTS_KEY },
                params: { date: tomorrow },
                timeout: 15000
            })
        ]);

        const allFixtures = [
            ...(todayRes.data?.response || []),
            ...(tomorrowRes.data?.response || [])
        ];

        return allFixtures.map(f => ({
            id: f.fixture.id,
            date: f.fixture.date,
            timestamp: f.fixture.timestamp,
            status: mapStatus(f.fixture.status.short),
            statusDetail: f.fixture.status.long,
            elapsed: f.fixture.status.elapsed,
            league: {
                id: f.league.id,
                name: f.league.name,
                country: f.league.country,
                logo: f.league.logo
            },
            homeTeam: {
                id: f.teams.home.id,
                name: f.teams.home.name,
                logo: f.teams.home.logo
            },
            awayTeam: {
                id: f.teams.away.id,
                name: f.teams.away.name,
                logo: f.teams.away.logo
            },
            score: {
                home: f.goals.home,
                away: f.goals.away
            },
            venue: f.fixture.venue?.name || null
        }));

    } catch (error) {
        console.error('Error fetching fixtures:', error.message);
        return [];
    }
};

// Fetch IPTV channels - SphereIPTV
const fetchIPTVChannels = async () => {
    const allChannels = [];

    for (const category of FOOTBALL_CATEGORIES) {
        try {
            const response = await axios.get(`${IPTV_PROTOCOL}://${IPTV_SERVER}/player_api.php`, {
                params: {
                    username: IPTV_USER,
                    password: IPTV_PASS,
                    action: 'get_live_streams',
                    category_id: category.id
                },
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                const channels = response.data
                    .filter(ch => !isExcludedChannel(ch.name))
                    .map(ch => ({
                        id: ch.stream_id,
                        name: ch.name,
                        category: category.name,
                        icon: ch.stream_icon || null
                    }));
                allChannels.push(...channels);
            }
        } catch (err) {
            console.error(`Error fetching IPTV category ${category.id}:`, err.message);
        }
    }

    const seen = new Set();
    return allChannels.filter(ch => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
    });
};

// Parse channel name to extract team names
// Format: "USA Soccer01: Spain - La Liga : Espanyol vs Deportivo Alavés @ 03:00pm EST"
const parseChannelName = (channelName) => {
    if (!channelName) return { homeTeam: null, awayTeam: null, league: null };

    let name = channelName;

    // Remove prefix like "USA Soccer01: "
    name = name.replace(/^[A-Z]+\s*Soccer\d*:\s*/i, '');

    // Remove time suffix like "@ 03:00pm EST"
    name = name.replace(/@\s*\d{1,2}:\d{2}\s*(am|pm)?\s*[A-Z]{2,4}$/i, '').trim();

    let league = null;
    let teamsStr = name;

    // Check for league separator ":"
    if (name.includes(':')) {
        const parts = name.split(':');
        if (parts.length >= 2) {
            league = parts[0].trim();
            teamsStr = parts.slice(1).join(':').trim();
        }
    }

    // Extract teams from "Team A vs Team B"
    const vsMatch = teamsStr.match(/(.+?)\s+(?:vs\.?|v)\s+(.+)/i);
    if (vsMatch) {
        return {
            homeTeam: normalizeTeamName(vsMatch[1].trim()),
            awayTeam: normalizeTeamName(vsMatch[2].trim()),
            league: league
        };
    }

    return { homeTeam: null, awayTeam: null, league: league };
};

// Calculate match score between fixture and parsed channel
const calculateMatchScore = (fixture, parsedChannel) => {
    let score = 0;

    const fixtureHome = normalizeTeamName(fixture.homeTeam.name);
    const fixtureAway = normalizeTeamName(fixture.awayTeam.name);
    const fixtureHomeAliases = getTeamAliases(fixtureHome);
    const fixtureAwayAliases = getTeamAliases(fixtureAway);

    const channelHome = parsedChannel.homeTeam || '';
    const channelAway = parsedChannel.awayTeam || '';
    const channelHomeAliases = getTeamAliases(channelHome);
    const channelAwayAliases = getTeamAliases(channelAway);

    // Check home team match
    const homeMatchesHome = fixtureHomeAliases.some(a => channelHomeAliases.includes(a));
    const homeMatchesAway = fixtureHomeAliases.some(a => channelAwayAliases.includes(a));

    // Check away team match
    const awayMatchesAway = fixtureAwayAliases.some(a => channelAwayAliases.includes(a));
    const awayMatchesHome = fixtureAwayAliases.some(a => channelHomeAliases.includes(a));

    // Both teams match in order = perfect
    if (homeMatchesHome && awayMatchesAway) {
        score = 3;
    }
    // Both teams match reversed = good
    else if (homeMatchesAway && awayMatchesHome) {
        score = 2;
    }
    // Only one team matches = NOT ENOUGH (score 1, won't be used)
    else if (homeMatchesHome || homeMatchesAway || awayMatchesAway || awayMatchesHome) {
        score = 1;
    }

    return score;
};

// Match fixtures with IPTV streams - STRICT MATCHING
const matchFixturesWithStreams = (fixtures, channels) => {
    const channelToFixture = new Map();

    for (const channel of channels) {
        const parsedChannel = parseChannelName(channel.name);
        if (!parsedChannel.homeTeam || !parsedChannel.awayTeam) continue;

        let bestMatch = null;
        let bestScore = 0;

        for (const fixture of fixtures) {
            const score = calculateMatchScore(fixture, parsedChannel);
            // STRICT: Minimum score of 2 (BOTH teams must match)
            if (score > bestScore && score >= 2) {
                bestScore = score;
                bestMatch = fixture;
            }
        }

        if (bestMatch) {
            const existing = channelToFixture.get(bestMatch.id);
            if (!existing || existing.score < bestScore) {
                channelToFixture.set(bestMatch.id, { channel, score: bestScore });
            }
        }
    }

    return fixtures.map(fixture => {
        const match = channelToFixture.get(fixture.id);
        return {
            ...fixture,
            stream: match ? {
                id: match.channel.id,
                name: match.channel.name,
                category: match.channel.category
            } : null,
            hasStream: !!match
        };
    });
};

// Get single match by ID
const getFootballMatch = async (req, res) => {
    try {
        const { id } = req.params;

        const fixtureRes = await axios.get(`${API_SPORTS_URL}/fixtures`, {
            headers: { 'x-apisports-key': API_SPORTS_KEY },
            params: { id },
            timeout: 15000
        });

        if (!fixtureRes.data?.response?.length) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }

        const f = fixtureRes.data.response[0];
        const fixture = {
            id: f.fixture.id,
            date: f.fixture.date,
            timestamp: f.fixture.timestamp,
            status: mapStatus(f.fixture.status.short),
            statusDetail: f.fixture.status.long,
            elapsed: f.fixture.status.elapsed,
            league: {
                id: f.league.id,
                name: f.league.name,
                country: f.league.country,
                logo: f.league.logo
            },
            homeTeam: {
                id: f.teams.home.id,
                name: f.teams.home.name,
                logo: f.teams.home.logo
            },
            awayTeam: {
                id: f.teams.away.id,
                name: f.teams.away.name,
                logo: f.teams.away.logo
            },
            score: {
                home: f.goals.home,
                away: f.goals.away
            },
            venue: f.fixture.venue?.name || null
        };

        const channels = await fetchIPTVChannels();
        const parsedFixture = {
            homeTeam: normalizeTeamName(fixture.homeTeam.name),
            awayTeam: normalizeTeamName(fixture.awayTeam.name)
        };

        // Find matching channel with strict matching
        let matchedChannel = null;
        for (const channel of channels) {
            const parsed = parseChannelName(channel.name);
            const score = calculateMatchScore(fixture, parsed);
            if (score >= 2) {
                matchedChannel = channel;
                break;
            }
        }

        res.json({
            success: true,
            match: {
                ...fixture,
                stream: matchedChannel ? {
                    id: matchedChannel.id,
                    name: matchedChannel.name,
                    category: matchedChannel.category
                } : null,
                hasStream: !!matchedChannel
            }
        });

    } catch (error) {
        console.error('Football Match Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch match', message: error.message });
    }
};

// Get stream by ID - RETURN MATCHED FIXTURE DATA
const getFootballStream = async (req, res) => {
    try {
        const { streamId } = req.params;

        const [channels, fixtures] = await Promise.all([
            fetchIPTVChannels(),
            fetchFixtures()
        ]);

        const channel = channels.find(ch => String(ch.id) === String(streamId));

        if (!channel) {
            return res.status(404).json({ success: false, error: 'Stream not found' });
        }

        // Parse channel name to get team info
        const parsedChannel = parseChannelName(channel.name);

        // Find matching fixture for this channel
        let matchedFixture = null;
        let bestScore = 0;

        if (parsedChannel.homeTeam && parsedChannel.awayTeam) {
            for (const fixture of fixtures) {
                const score = calculateMatchScore(fixture, parsedChannel);
                if (score > bestScore && score >= 2) {
                    bestScore = score;
                    matchedFixture = fixture;
                }
            }
        }

        res.json({
            success: true,
            stream: channel,
            match: matchedFixture ? {
                id: matchedFixture.id,
                date: matchedFixture.date,
                status: matchedFixture.status,
                elapsed: matchedFixture.elapsed,
                league: matchedFixture.league,
                homeTeam: matchedFixture.homeTeam,
                awayTeam: matchedFixture.awayTeam,
                score: matchedFixture.score
            } : null,
            parsedInfo: !matchedFixture ? parsedChannel : null
        });

    } catch (error) {
        console.error('Football Stream Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch stream', message: error.message });
    }
};

// Helper functions
const mapStatus = (status) => {
    const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'];
    const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
    if (liveStatuses.includes(status)) return 'LIVE';
    if (finishedStatuses.includes(status)) return 'FINISHED';
    return 'UPCOMING';
};

const normalizeTeamName = (name) => {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/fc|cf|sc|ac|as|ss|afc|ssc/gi, '')
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const getTeamAliases = (teamName) => {
    if (!teamName) return [];
    const normalized = teamName.toLowerCase().trim();
    const aliases = [normalized];

    for (const [key, values] of Object.entries(TEAM_ALIASES)) {
        if (normalized.includes(key) || values.some(v => normalized.includes(v))) {
            aliases.push(key, ...values);
        }
    }

    const firstWord = normalized.split(' ')[0];
    if (firstWord && firstWord.length > 3) {
        aliases.push(firstWord);
    }

    return [...new Set(aliases.map(a => a.toLowerCase().trim()).filter(a => a))];
};

const isExcludedChannel = (name) => {
    if (!name) return true;
    const trimmedName = name.replace(/USA Soccer\d+:\s*/, '').trim();
    if (!trimmedName) return true;
    const upper = name.toUpperCase();
    const excludeKeywords = ['#####', '######', 'NO EVENT', 'OFF AIR', 'PLACEHOLDER'];
    return excludeKeywords.some(kw => upper.includes(kw));
};

const hasTeamNames = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower.includes(' vs ') || lower.includes(' v ');
};

module.exports = {
    getFootballMatches,
    getFootballMatch,
    getFootballStream
};
