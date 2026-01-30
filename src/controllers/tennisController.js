const axios = require('axios');

// Tennis API Key dari api-tennis.com
const TENNIS_API_KEY = 'd684c33a66ebdb79f62ee44537b617e8e386dd4475111e5718b17889519048da';
const TENNIS_API_URL = 'https://api.api-tennis.com/tennis/';

// IPTV Category for Tennis
const TENNIS_IPTV_CATEGORY = 1429;

// Top Tennis Players name mappings for IPTV matching
const TENNIS_PLAYER_MAPPINGS = {
    // Men's Top Players
    'J. Sinner': ['Sinner', 'Jannik'],
    'Jannik Sinner': ['Sinner', 'Jannik'],
    'C. Alcaraz': ['Alcaraz', 'Carlos'],
    'Carlos Alcaraz': ['Alcaraz', 'Carlos'],
    'N. Djokovic': ['Djokovic', 'Novak', 'Nole'],
    'Novak Djokovic': ['Djokovic', 'Novak', 'Nole'],
    'A. Zverev': ['Zverev', 'Sascha', 'Alexander'],
    'Alexander Zverev': ['Zverev', 'Sascha', 'Alexander'],
    'D. Medvedev': ['Medvedev', 'Daniil'],
    'Daniil Medvedev': ['Medvedev', 'Daniil'],
    'A. Rublev': ['Rublev', 'Andrey'],
    'H. Rune': ['Rune', 'Holger'],
    'S. Tsitsipas': ['Tsitsipas', 'Stefanos'],
    'C. Ruud': ['Ruud', 'Casper'],
    'T. Fritz': ['Fritz', 'Taylor'],
    'G. Dimitrov': ['Dimitrov', 'Grigor'],
    'A. de Minaur': ['de Minaur', 'Minaur', 'Alex'],
    'T. Paul': ['Tommy Paul', 'Paul'],
    'H. Hurkacz': ['Hurkacz', 'Hubert'],
    'F. Tiafoe': ['Tiafoe', 'Frances'],
    'B. Shelton': ['Shelton', 'Ben'],
    'S. Korda': ['Korda', 'Sebastian'],
    'F. Auger-Aliassime': ['Auger-Aliassime', 'FAA', 'Felix'],
    'K. Khachanov': ['Khachanov', 'Karen'],
    'N. Kyrgios': ['Kyrgios', 'Nick'],
    'R. Nadal': ['Nadal', 'Rafa', 'Rafael'],
    'R. Federer': ['Federer', 'Roger'],
    'A. Murray': ['Murray', 'Andy'],

    // Women's Top Players
    'A. Sabalenka': ['Sabalenka', 'Aryna'],
    'Aryna Sabalenka': ['Sabalenka', 'Aryna'],
    'I. Swiatek': ['Swiatek', 'Iga'],
    'Iga Swiatek': ['Swiatek', 'Iga'],
    'C. Gauff': ['Gauff', 'Coco'],
    'Coco Gauff': ['Gauff', 'Coco'],
    'E. Rybakina': ['Rybakina', 'Elena'],
    'J. Pegula': ['Pegula', 'Jessica'],
    'O. Jabeur': ['Jabeur', 'Ons'],
    'M. Vondrousova': ['Vondrousova', 'Marketa'],
    'Q. Zheng': ['Zheng', 'Qinwen'],
    'M. Sakkari': ['Sakkari', 'Maria'],
    'J. Ostapenko': ['Ostapenko', 'Jelena'],
    'K. Muchova': ['Muchova', 'Karolina'],
    'B. Haddad Maia': ['Haddad Maia', 'Beatriz'],
    'M. Keys': ['Keys', 'Madison'],
    'L. Samsonova': ['Samsonova', 'Liudmila'],
    'D. Kasatkina': ['Kasatkina', 'Daria'],
    'C. Garcia': ['Garcia', 'Caroline'],
    'E. Svitolina': ['Svitolina', 'Elina'],
    'N. Osaka': ['Osaka', 'Naomi'],
    'E. Raducanu': ['Raducanu', 'Emma'],
    'S. Williams': ['Serena', 'Williams'],
    'V. Williams': ['Venus', 'V. Williams']
};

// Get all player aliases for matching
const getPlayerAliases = (playerName) => {
    if (!playerName) return [];
    
    const aliases = [playerName.toLowerCase()];

    // Check mappings
    for (const [fullName, shortNames] of Object.entries(TENNIS_PLAYER_MAPPINGS)) {
        if (fullName.toLowerCase() === playerName.toLowerCase()) {
            shortNames.forEach(name => aliases.push(name.toLowerCase()));
            break;
        }
    }

    // Add last name as alias (usually most unique identifier)
    const nameParts = playerName.split(' ');
    if (nameParts.length > 1) {
        const lastName = nameParts[nameParts.length - 1];
        if (lastName.length > 2) {
            aliases.push(lastName.toLowerCase());
        }
    }
    
    // Also add first initial + last name pattern (e.g., "J. Sinner" -> "sinner")
    if (playerName.includes('.')) {
        const parts = playerName.split(' ');
        if (parts.length > 1) {
            aliases.push(parts[parts.length - 1].toLowerCase());
        }
    }

    return [...new Set(aliases)];
};

// Check if IPTV channel matches Tennis game
const matchIptvChannel = (channel, player1, player2) => {
    const channelName = channel.name.toLowerCase();

    // Skip generic/placeholder channels
    if (channelName.includes('###') ||
        channelName.match(/^tennis\s*\d*\s*:?\s*$/i)) {
        return false;
    }

    // Must contain tennis-related keywords or tournament names
    const tennisKeywords = ['tennis', 'atp', 'wta', 'open', 'slam', 'wimbledon', 'roland', 'garros', 'australian', 'us open', 'masters', 'itf'];
    const hasTennisKeyword = tennisKeywords.some(kw => channelName.includes(kw));

    if (!hasTennisKeyword) {
        return false;
    }

    const player1Aliases = getPlayerAliases(player1);
    const player2Aliases = getPlayerAliases(player2);

    const hasPlayer1 = player1Aliases.some(alias => {
        if (alias.length <= 3) {
            const regex = new RegExp(`\\b${alias}\\b`, 'i');
            return regex.test(channelName);
        }
        return channelName.includes(alias);
    });

    const hasPlayer2 = player2Aliases.some(alias => {
        if (alias.length <= 3) {
            const regex = new RegExp(`\\b${alias}\\b`, 'i');
            return regex.test(channelName);
        }
        return channelName.includes(alias);
    });

    // Match if both players found
    return hasPlayer1 && hasPlayer2;
};

// Fetch IPTV channels for Tennis (category 1429)
const fetchIptvChannels = async () => {
    try {
        const baseUrl = process.env.IPTV_SERVER;
        const username = process.env.IPTV_USER;
        const password = process.env.IPTV_PASS;

        const url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams&category_id=${TENNIS_IPTV_CATEGORY}`;

        const response = await axios.get(url, { timeout: 10000 });
        return response.data || [];
    } catch (error) {
        console.error('Error fetching Tennis IPTV channels:', error.message);
        return [];
    }
};

// Fetch LIVE Tennis matches from api-tennis.com
const fetchTennisLivescore = async () => {
    try {
        const response = await axios.get(TENNIS_API_URL, {
            params: {
                method: 'get_livescore',
                APIkey: TENNIS_API_KEY
            },
            timeout: 15000
        });

        if (response.data.success === 1) {
            return response.data.result || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching Tennis livescore:', error.message);
        return [];
    }
};

// Fetch Tennis fixtures for a date range
const fetchTennisFixtures = async (dateStart, dateStop) => {
    try {
        const response = await axios.get(TENNIS_API_URL, {
            params: {
                method: 'get_fixtures',
                APIkey: TENNIS_API_KEY,
                date_start: dateStart,
                date_stop: dateStop
            },
            timeout: 15000
        });

        if (response.data.success === 1) {
            return response.data.result || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching Tennis fixtures:', error.message);
        return [];
    }
};

// Fetch Tennis fixtures for today and tomorrow
const fetchTennisFixturesMultiDate = async () => {
    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const fixtures = await fetchTennisFixtures(todayStr, tomorrowStr);
        return fixtures;
    } catch (error) {
        console.error('Error fetching Tennis fixtures multi-date:', error.message);
        return [];
    }
};

// Build stream URL
const buildStreamUrl = (streamId) => {
    const baseUrl = process.env.IPTV_SERVER;
    const username = process.env.IPTV_USER;
    const password = process.env.IPTV_PASS;

    return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
};

// Process and match games with streams (for api-tennis.com format)
const processGamesWithStreams = (games, iptvChannels) => {
    return games.map(game => {
        const player1 = game.event_first_player || 'Player 1';
        const player2 = game.event_second_player || 'Player 2';

        const matchedChannel = iptvChannels.find(channel =>
            matchIptvChannel(channel, player1, player2)
        );

        // Parse scores from api-tennis.com format
        const scores = game.scores || [];
        const formattedScores = scores.map(s => ({
            set: s.score_set,
            player1: s.score_first,
            player2: s.score_second
        }));

        return {
            id: game.event_key,
            date: game.event_date,
            time: game.event_time,
            status: {
                short: game.event_status || 'NS',
                long: game.event_status || 'Not Started',
                live: game.event_live === '1'
            },
            tournament: {
                id: game.tournament_key || game.league_key,
                name: game.tournament_name || game.league_name,
                type: game.event_type_type || game.country_name,
                round: game.tournament_round || game.league_round,
                season: game.tournament_season || game.league_season
            },
            player1: {
                id: game.first_player_key,
                name: player1,
                logo: game.event_first_player_logo
            },
            player2: {
                id: game.second_player_key,
                name: player2,
                logo: game.event_second_player_logo
            },
            result: game.event_final_result,
            gameResult: game.event_game_result,
            serve: game.event_serve,
            winner: game.event_winner,
            scores: formattedScores,
            stream: matchedChannel ? {
                channelName: matchedChannel.name,
                streamId: matchedChannel.stream_id,
                streamUrl: buildStreamUrl(matchedChannel.stream_id)
            } : null,
            hasStream: !!matchedChannel
        };
    });
};

// ========== CONTROLLER FUNCTIONS ==========

// GET /api/tennis - Get all tennis matches (live + fixtures)
const getTennisMatches = async (req, res) => {
    try {
        const { date } = req.query;

        let tennisGames = [];
        
        if (date) {
            // Fetch specific date
            tennisGames = await fetchTennisFixtures(date, date);
        } else {
            // Fetch live + today/tomorrow fixtures
            const [livescores, fixtures] = await Promise.all([
                fetchTennisLivescore(),
                fetchTennisFixturesMultiDate()
            ]);
            
            // Merge and deduplicate by event_key
            const allGames = [...livescores, ...fixtures];
            const uniqueGames = allGames.filter((game, index, self) =>
                index === self.findIndex(g => g.event_key === game.event_key)
            );
            tennisGames = uniqueGames;
        }

        const iptvChannels = await fetchIptvChannels();

        const matchedGames = processGamesWithStreams(tennisGames, iptvChannels);

        // Sort: live first, then with stream, then by date/time
        matchedGames.sort((a, b) => {
            // Live matches first
            if (a.status.live && !b.status.live) return -1;
            if (!a.status.live && b.status.live) return 1;
            // Then with stream
            if (a.hasStream && !b.hasStream) return -1;
            if (!a.hasStream && b.hasStream) return 1;
            // Then by date and time
            const dateTimeA = `${a.date} ${a.time}`;
            const dateTimeB = `${b.date} ${b.time}`;
            return dateTimeA.localeCompare(dateTimeB);
        });

        res.json({
            success: true,
            date: date || 'today+tomorrow',
            total: matchedGames.length,
            withStreams: matchedGames.filter(g => g.hasStream).length,
            liveCount: matchedGames.filter(g => g.status.live).length,
            iptvChannelsFound: iptvChannels.length,
            matches: matchedGames
        });

    } catch (error) {
        console.error('Error in getTennisMatches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Tennis matches'
        });
    }
};

// GET /api/tennis/live - Get only live tennis matches
const getLiveTennisMatches = async (req, res) => {
    try {
        const [livescores, iptvChannels] = await Promise.all([
            fetchTennisLivescore(),
            fetchIptvChannels()
        ]);

        // Filter only live matches
        const liveGames = livescores.filter(game => game.event_live === '1');

        const matchedGames = processGamesWithStreams(liveGames, iptvChannels);

        res.json({
            success: true,
            total: matchedGames.length,
            withStreams: matchedGames.filter(g => g.hasStream).length,
            matches: matchedGames
        });

    } catch (error) {
        console.error('Error in getLiveTennisMatches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live Tennis matches'
        });
    }
};

// GET /api/tennis/today - Get today's tennis matches (upcoming + live)
const getTodayTennisMatches = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const [livescores, fixtures, iptvChannels] = await Promise.all([
            fetchTennisLivescore(),
            fetchTennisFixtures(today, today),
            fetchIptvChannels()
        ]);

        // Merge and deduplicate
        const allGames = [...livescores, ...fixtures];
        const uniqueGames = allGames.filter((game, index, self) =>
            index === self.findIndex(g => g.event_key === game.event_key)
        );

        // Filter out finished games
        const activeGames = uniqueGames.filter(game => {
            const status = (game.event_status || '').toLowerCase();
            return !status.includes('finished') && 
                   !status.includes('ended') && 
                   !status.includes('cancelled') &&
                   !status.includes('retired') &&
                   !status.includes('walkover');
        });

        const matchedGames = processGamesWithStreams(activeGames, iptvChannels);

        // Sort by time
        matchedGames.sort((a, b) => {
            if (a.status.live && !b.status.live) return -1;
            if (!a.status.live && b.status.live) return 1;
            const dateTimeA = `${a.date} ${a.time}`;
            const dateTimeB = `${b.date} ${b.time}`;
            return dateTimeA.localeCompare(dateTimeB);
        });

        res.json({
            success: true,
            date: today,
            total: matchedGames.length,
            withStreams: matchedGames.filter(g => g.hasStream).length,
            liveCount: matchedGames.filter(g => g.status.live).length,
            matches: matchedGames
        });

    } catch (error) {
        console.error('Error in getTodayTennisMatches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch today\'s Tennis matches'
        });
    }
};

module.exports = {
    getTennisMatches,
    getLiveTennisMatches,
    getTodayTennisMatches
};
