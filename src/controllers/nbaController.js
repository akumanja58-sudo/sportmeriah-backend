const axios = require('axios');

// NBA Team name mappings for IPTV matching
const NBA_TEAM_MAPPINGS = {
    // Full names to short/common names and abbreviations
    'Atlanta Hawks': ['Hawks', 'Atlanta', 'ATL'],
    'Boston Celtics': ['Celtics', 'Boston', 'BOS'],
    'Brooklyn Nets': ['Nets', 'Brooklyn', 'BKN'],
    'Charlotte Hornets': ['Hornets', 'Charlotte', 'CHA'],
    'Chicago Bulls': ['Bulls', 'Chicago', 'CHI'],
    'Cleveland Cavaliers': ['Cavaliers', 'Cleveland', 'Cavs', 'CLE'],
    'Dallas Mavericks': ['Mavericks', 'Dallas', 'Mavs', 'DAL'],
    'Denver Nuggets': ['Nuggets', 'Denver', 'DEN'],
    'Detroit Pistons': ['Pistons', 'Detroit', 'DET'],
    'Golden State Warriors': ['Warriors', 'Golden State', 'GSW'],
    'Houston Rockets': ['Rockets', 'Houston', 'HOU'],
    'Indiana Pacers': ['Pacers', 'Indiana', 'IND'],
    'Los Angeles Clippers': ['Clippers', 'LA Clippers', 'LAC'],
    'Los Angeles Lakers': ['Lakers', 'LA Lakers', 'LAL'],
    'Memphis Grizzlies': ['Grizzlies', 'Memphis', 'MEM'],
    'Miami Heat': ['Heat', 'Miami', 'MIA'],
    'Milwaukee Bucks': ['Bucks', 'Milwaukee', 'MIL'],
    'Minnesota Timberwolves': ['Timberwolves', 'Minnesota', 'Wolves', 'MIN'],
    'New Orleans Pelicans': ['Pelicans', 'New Orleans', 'NOP'],
    'New York Knicks': ['Knicks', 'New York', 'NYK'],
    'Oklahoma City Thunder': ['Thunder', 'Oklahoma City', 'OKC'],
    'Orlando Magic': ['Magic', 'Orlando', 'ORL'],
    'Philadelphia 76ers': ['76ers', 'Philadelphia', 'Sixers', 'Philly', 'PHI'],
    'Phoenix Suns': ['Suns', 'Phoenix', 'PHX'],
    'Portland Trail Blazers': ['Trail Blazers', 'Portland', 'Blazers', 'POR'],
    'Sacramento Kings': ['Kings', 'Sacramento', 'SAC'],
    'San Antonio Spurs': ['Spurs', 'San Antonio', 'SAS'],
    'Toronto Raptors': ['Raptors', 'Toronto', 'TOR'],
    'Utah Jazz': ['Jazz', 'Utah', 'UTA'],
    'Washington Wizards': ['Wizards', 'Washington', 'WAS']
};

// Get all team aliases for matching
const getTeamAliases = (teamName) => {
    const aliases = [teamName.toLowerCase()];

    for (const [fullName, shortNames] of Object.entries(NBA_TEAM_MAPPINGS)) {
        if (fullName.toLowerCase() === teamName.toLowerCase()) {
            shortNames.forEach(name => aliases.push(name.toLowerCase()));
            break;
        }
    }

    // Also add individual words from team name (except common words)
    const skipWords = ['los', 'angeles', 'new', 'york', 'san', 'antonio', 'oklahoma', 'city', 'golden', 'state', 'trail'];
    teamName.split(' ').forEach(word => {
        if (word.length > 2 && !skipWords.includes(word.toLowerCase())) {
            aliases.push(word.toLowerCase());
        }
    });

    return [...new Set(aliases)]; // Remove duplicates
};

// Check if IPTV channel matches NBA game
const matchIptvChannel = (channel, homeTeam, awayTeam) => {
    const channelName = channel.name.toLowerCase();

    // Skip non-match channels (headers, generic channels, empty)
    if (channelName.includes('###') ||
        channelName === 'nba: nba tv hd' ||
        channelName.match(/^nba \d+\s*:?\s*$/)) {
        return false;
    }

    // Must contain "nba" to be relevant
    if (!channelName.includes('nba')) {
        return false;
    }

    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);

    // Check if channel contains both teams
    const hasHome = homeAliases.some(alias => {
        // Use word boundary matching for short aliases (3 chars like team codes)
        if (alias.length <= 3) {
            const regex = new RegExp(`\\b${alias}\\b|\\(${alias}\\)`, 'i');
            return regex.test(channelName);
        }
        return channelName.includes(alias);
    });

    const hasAway = awayAliases.some(alias => {
        if (alias.length <= 3) {
            const regex = new RegExp(`\\b${alias}\\b|\\(${alias}\\)`, 'i');
            return regex.test(channelName);
        }
        return channelName.includes(alias);
    });

    // Match if channel contains both teams
    return hasHome && hasAway;
};

// Fetch IPTV channels for NBA (category 605)
const fetchIptvChannels = async () => {
    try {
        const baseUrl = process.env.IPTV_BASE_URL;
        const username = process.env.IPTV_USERNAME;
        const password = process.env.IPTV_PASSWORD;

        // NBA category ID
        const categoryId = 605;

        const url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${categoryId}`;

        const response = await axios.get(url, { timeout: 10000 });
        return response.data || [];
    } catch (error) {
        console.error('Error fetching IPTV channels:', error.message);
        return [];
    }
};

// Fetch NBA games from API-Basketball
const fetchNbaGames = async (date = null) => {
    try {
        const apiKey = process.env.FOOTBALL_API_KEY;

        // Use today's date if not provided
        if (!date) {
            const today = new Date();
            date = today.toISOString().split('T')[0];
        }

        const response = await axios.get('https://v1.basketball.api-sports.io/games', {
            headers: {
                'x-apisports-key': apiKey
            },
            params: {
                date: date,
                league: 12, // NBA league ID
                season: '2025-2026'
            },
            timeout: 10000
        });

        return response.data.response || [];
    } catch (error) {
        console.error('Error fetching NBA games:', error.message);
        return [];
    }
};

// Fetch NBA games for multiple dates (to catch timezone differences)
const fetchNbaGamesMultiDate = async () => {
    try {
        const apiKey = process.env.FOOTBALL_API_KEY;

        // Get today and tomorrow (UTC) to cover ET timezone differences
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fetch both days in parallel
        const [todayGames, tomorrowGames] = await Promise.all([
            axios.get('https://v1.basketball.api-sports.io/games', {
                headers: { 'x-apisports-key': apiKey },
                params: { date: todayStr, league: 12, season: '2025-2026' },
                timeout: 10000
            }).then(res => res.data.response || []).catch(() => []),

            axios.get('https://v1.basketball.api-sports.io/games', {
                headers: { 'x-apisports-key': apiKey },
                params: { date: tomorrowStr, league: 12, season: '2025-2026' },
                timeout: 10000
            }).then(res => res.data.response || []).catch(() => [])
        ]);

        // Combine and deduplicate by game ID
        const allGames = [...todayGames, ...tomorrowGames];
        const uniqueGames = allGames.filter((game, index, self) =>
            index === self.findIndex(g => g.id === game.id)
        );

        return uniqueGames;
    } catch (error) {
        console.error('Error fetching NBA games:', error.message);
        return [];
    }
};

// Build stream URL
const buildStreamUrl = (streamId) => {
    const baseUrl = process.env.IPTV_BASE_URL;
    const username = process.env.IPTV_USERNAME;
    const password = process.env.IPTV_PASSWORD;

    return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
};

// Process and match games with streams
const processGamesWithStreams = (games, iptvChannels) => {
    return games.map(game => {
        const homeTeam = game.teams.home.name;
        const awayTeam = game.teams.away.name;

        // Find matching IPTV channel
        const matchedChannel = iptvChannels.find(channel =>
            matchIptvChannel(channel, homeTeam, awayTeam)
        );

        return {
            id: game.id,
            date: game.date,
            time: game.time,
            timestamp: game.timestamp,
            status: game.status,
            league: game.league,
            homeTeam: {
                id: game.teams.home.id,
                name: homeTeam,
                logo: game.teams.home.logo
            },
            awayTeam: {
                id: game.teams.away.id,
                name: awayTeam,
                logo: game.teams.away.logo
            },
            scores: game.scores,
            venue: game.venue,
            stream: matchedChannel ? {
                channelName: matchedChannel.name,
                streamId: matchedChannel.stream_id,
                streamUrl: buildStreamUrl(matchedChannel.stream_id)
            } : null,
            hasStream: !!matchedChannel
        };
    });
};

// Main controller functions
const getNbaMatches = async (req, res) => {
    try {
        const { date } = req.query;

        let nbaGames;
        if (date) {
            // Specific date requested
            nbaGames = await fetchNbaGames(date);
        } else {
            // No date = fetch today + tomorrow to cover timezones
            nbaGames = await fetchNbaGamesMultiDate();
        }

        const iptvChannels = await fetchIptvChannels();

        // Match games with streams
        const matchedGames = processGamesWithStreams(nbaGames, iptvChannels);

        // Sort: games with streams first, then by timestamp
        matchedGames.sort((a, b) => {
            if (a.hasStream && !b.hasStream) return -1;
            if (!a.hasStream && b.hasStream) return 1;
            return a.timestamp - b.timestamp;
        });

        res.json({
            success: true,
            date: date || 'today+tomorrow',
            total: matchedGames.length,
            withStreams: matchedGames.filter(g => g.hasStream).length,
            matches: matchedGames
        });

    } catch (error) {
        console.error('Error in getNbaMatches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch NBA matches'
        });
    }
};

const getLiveNbaMatches = async (req, res) => {
    try {
        const [nbaGames, iptvChannels] = await Promise.all([
            fetchNbaGamesMultiDate(),
            fetchIptvChannels()
        ]);

        // Filter only live games
        const liveStatuses = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'BT'];
        const liveGames = nbaGames.filter(game =>
            liveStatuses.includes(game.status.short)
        );

        const matchedGames = processGamesWithStreams(liveGames, iptvChannels);

        res.json({
            success: true,
            total: matchedGames.length,
            withStreams: matchedGames.filter(g => g.hasStream).length,
            matches: matchedGames
        });

    } catch (error) {
        console.error('Error in getLiveNbaMatches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live NBA matches'
        });
    }
};

const getTodayNbaMatches = async (req, res) => {
    try {
        const [nbaGames, iptvChannels] = await Promise.all([
            fetchNbaGamesMultiDate(),
            fetchIptvChannels()
        ]);

        // Filter only upcoming and live games (not finished)
        const activeStatuses = ['NS', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'BT'];
        const activeGames = nbaGames.filter(game =>
            activeStatuses.includes(game.status.short)
        );

        const matchedGames = processGamesWithStreams(activeGames, iptvChannels);

        // Sort by timestamp
        matchedGames.sort((a, b) => a.timestamp - b.timestamp);

        res.json({
            success: true,
            total: matchedGames.length,
            withStreams: matchedGames.filter(g => g.hasStream).length,
            matches: matchedGames
        });

    } catch (error) {
        console.error('Error in getTodayNbaMatches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch today\'s NBA matches'
        });
    }
};

module.exports = {
    getNbaMatches,
    getLiveNbaMatches,
    getTodayNbaMatches
};
