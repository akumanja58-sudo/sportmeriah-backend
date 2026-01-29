const axios = require('axios');

// NBA Team name mappings for IPTV matching
const NBA_TEAM_MAPPINGS = {
    // Full names to short/common names
    'Atlanta Hawks': ['Hawks', 'Atlanta'],
    'Boston Celtics': ['Celtics', 'Boston'],
    'Brooklyn Nets': ['Nets', 'Brooklyn'],
    'Charlotte Hornets': ['Hornets', 'Charlotte'],
    'Chicago Bulls': ['Bulls', 'Chicago'],
    'Cleveland Cavaliers': ['Cavaliers', 'Cleveland', 'Cavs'],
    'Dallas Mavericks': ['Mavericks', 'Dallas', 'Mavs'],
    'Denver Nuggets': ['Nuggets', 'Denver'],
    'Detroit Pistons': ['Pistons', 'Detroit'],
    'Golden State Warriors': ['Warriors', 'Golden State', 'GSW'],
    'Houston Rockets': ['Rockets', 'Houston'],
    'Indiana Pacers': ['Pacers', 'Indiana'],
    'Los Angeles Clippers': ['Clippers', 'LA Clippers', 'LAC'],
    'Los Angeles Lakers': ['Lakers', 'LA Lakers', 'LAL'],
    'Memphis Grizzlies': ['Grizzlies', 'Memphis'],
    'Miami Heat': ['Heat', 'Miami'],
    'Milwaukee Bucks': ['Bucks', 'Milwaukee'],
    'Minnesota Timberwolves': ['Timberwolves', 'Minnesota', 'Wolves'],
    'New Orleans Pelicans': ['Pelicans', 'New Orleans'],
    'New York Knicks': ['Knicks', 'New York', 'NYK'],
    'Oklahoma City Thunder': ['Thunder', 'Oklahoma City', 'OKC'],
    'Orlando Magic': ['Magic', 'Orlando'],
    'Philadelphia 76ers': ['76ers', 'Philadelphia', 'Sixers', 'Philly'],
    'Phoenix Suns': ['Suns', 'Phoenix'],
    'Portland Trail Blazers': ['Trail Blazers', 'Portland', 'Blazers'],
    'Sacramento Kings': ['Kings', 'Sacramento'],
    'San Antonio Spurs': ['Spurs', 'San Antonio'],
    'Toronto Raptors': ['Raptors', 'Toronto'],
    'Utah Jazz': ['Jazz', 'Utah'],
    'Washington Wizards': ['Wizards', 'Washington']
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
    
    // Also add individual words from team name
    teamName.split(' ').forEach(word => {
        if (word.length > 2) {
            aliases.push(word.toLowerCase());
        }
    });
    
    return aliases;
};

// Check if IPTV channel matches NBA game
const matchIptvChannel = (channel, homeTeam, awayTeam) => {
    const channelName = channel.name.toLowerCase();
    
    // Skip non-match channels (headers, generic channels)
    if (channelName.includes('###') || channelName.includes('nba tv')) {
        return false;
    }
    
    // Must contain "nba" to be relevant
    if (!channelName.includes('nba')) {
        return false;
    }
    
    const homeAliases = getTeamAliases(homeTeam);
    const awayAliases = getTeamAliases(awayTeam);
    
    // Check if channel contains both teams or at least one team with @ symbol
    const hasHome = homeAliases.some(alias => channelName.includes(alias));
    const hasAway = awayAliases.some(alias => channelName.includes(alias));
    
    // Match if channel contains both teams
    if (hasHome && hasAway) {
        return true;
    }
    
    // Match if channel contains "team @ team" pattern with at least one match
    if (channelName.includes('@') && (hasHome || hasAway)) {
        return true;
    }
    
    // Match if channel contains "team vs team" or "team x team" pattern
    if ((channelName.includes(' vs ') || channelName.includes(' x ')) && (hasHome || hasAway)) {
        return true;
    }
    
    return false;
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
        const apiKey = process.env.FOOTBALL_API_KEY; // Same key works for all API-Sports
        
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

// Build stream URL
const buildStreamUrl = (streamId) => {
    const baseUrl = process.env.IPTV_BASE_URL;
    const username = process.env.IPTV_USERNAME;
    const password = process.env.IPTV_PASSWORD;
    
    return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
};

// Main controller functions
const getNbaMatches = async (req, res) => {
    try {
        const { date } = req.query;
        
        // Fetch both NBA games and IPTV channels in parallel
        const [nbaGames, iptvChannels] = await Promise.all([
            fetchNbaGames(date),
            fetchIptvChannels()
        ]);
        
        // Match games with streams
        const matchedGames = nbaGames.map(game => {
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
        
        // Sort: games with streams first, then by time
        matchedGames.sort((a, b) => {
            if (a.hasStream && !b.hasStream) return -1;
            if (!a.hasStream && b.hasStream) return 1;
            return a.timestamp - b.timestamp;
        });
        
        res.json({
            success: true,
            date: date || new Date().toISOString().split('T')[0],
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
            fetchNbaGames(),
            fetchIptvChannels()
        ]);
        
        // Filter only live games
        const liveStatuses = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'BT'];
        const liveGames = nbaGames.filter(game => 
            liveStatuses.includes(game.status.short)
        );
        
        const matchedGames = liveGames.map(game => {
            const homeTeam = game.teams.home.name;
            const awayTeam = game.teams.away.name;
            
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
        const today = new Date().toISOString().split('T')[0];
        
        const [nbaGames, iptvChannels] = await Promise.all([
            fetchNbaGames(today),
            fetchIptvChannels()
        ]);
        
        // Filter only upcoming and live games (not finished)
        const activeStatuses = ['NS', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'BT'];
        const activeGames = nbaGames.filter(game => 
            activeStatuses.includes(game.status.short)
        );
        
        const matchedGames = activeGames.map(game => {
            const homeTeam = game.teams.home.name;
            const awayTeam = game.teams.away.name;
            
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
        
        // Sort by time
        matchedGames.sort((a, b) => a.timestamp - b.timestamp);
        
        res.json({
            success: true,
            date: today,
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
