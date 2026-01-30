const axios = require('axios');

// Tennis API configuration
const TENNIS_API_KEY = process.env.TENNIS_API_KEY;
const TENNIS_API_URL = 'https://api.api-tennis.com/tennis';

// IPTV configuration
const IPTV_SERVER = process.env.IPTV_SERVER;
const IPTV_USER = process.env.IPTV_USER;
const IPTV_PASS = process.env.IPTV_PASS;

// General Tennis channels (from TENNIS LIVE category 1096)
const TENNIS_CHANNELS = [
    { name: 'SKY SPORT TENNIS 4K', stream_id: 686564, quality: '4K' },
    { name: 'US TENNIS HD', stream_id: 686562, quality: 'HD' },
    { name: 'NL ZIGGO SPORT TENNIS 4K', stream_id: 686566, quality: '4K' },
    { name: 'IT SKY SPORT TENNIS 4K', stream_id: 686543, quality: '4K' },
    { name: 'IT SKY SPORT TENNIS HD', stream_id: 686541, quality: 'HD' },
    { name: 'DE SKY SPORT TENNIS HD', stream_id: 686546, quality: 'HD' },
];

// Default channel for live matches
const DEFAULT_TENNIS_CHANNEL = TENNIS_CHANNELS[0]; // SKY SPORT TENNIS 4K

// Get tennis matches
const getTennisMatches = async (req, res) => {
    try {
        // Get today's date and tomorrow in required format
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Fetch live matches
        const liveResponse = await axios.get(TENNIS_API_URL, {
            params: {
                method: 'get_livescore',
                APIkey: TENNIS_API_KEY
            }
        });

        // Fetch today's fixtures
        const fixturesResponse = await axios.get(TENNIS_API_URL, {
            params: {
                method: 'get_fixtures',
                APIkey: TENNIS_API_KEY,
                date_start: formatDate(today),
                date_stop: formatDate(tomorrow)
            }
        });

        // Process live matches
        const liveMatches = processMatches(liveResponse.data?.result || [], true);

        // Process fixtures
        const fixtures = processMatches(fixturesResponse.data?.result || [], false);

        // Combine and deduplicate (live matches take priority)
        const liveIds = new Set(liveMatches.map(m => m.id));
        const allMatches = [
            ...liveMatches,
            ...fixtures.filter(m => !liveIds.has(m.id))
        ];

        // Sort by date/time
        allMatches.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });

        // Assign streams to live matches
        const matchesWithStreams = assignStreamsToMatches(allMatches);

        // Count stats
        const liveCount = matchesWithStreams.filter(m => isLiveStatus(m)).length;
        const withStreams = matchesWithStreams.filter(m => m.hasStream).length;

        res.json({
            success: true,
            date: 'today+tomorrow',
            total: matchesWithStreams.length,
            withStreams,
            liveCount,
            availableChannels: TENNIS_CHANNELS,
            matches: matchesWithStreams
        });

    } catch (error) {
        console.error('Tennis API Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tennis matches',
            message: error.message
        });
    }
};

// Process raw match data from API
const processMatches = (matches, isLive) => {
    if (!Array.isArray(matches)) return [];

    return matches.map(match => {
        // Parse scores
        const scores = parseScores(match);

        // Determine status
        const status = {
            short: match.event_status || (isLive ? 'LIVE' : 'NS'),
            long: match.event_status || (isLive ? 'Live' : 'Not Started'),
            live: isLive || match.event_live === '1'
        };

        return {
            id: parseInt(match.event_key) || match.event_key,
            date: match.event_date || '',
            time: match.event_time || '',
            status,
            tournament: {
                id: match.tournament_key,
                name: match.tournament_name || '',
                type: match.tournament_type || '',
                round: match.event_type_type || match.round_name || '',
                season: match.tournament_season || ''
            },
            player1: {
                id: match.home_player_key || match.first_player_key,
                name: match.event_first_player || '',
                logo: match.event_first_player_logo || null
            },
            player2: {
                id: match.away_player_key || match.second_player_key,
                name: match.event_second_player || '',
                logo: match.event_second_player_logo || null
            },
            result: match.event_final_result || '-',
            gameResult: match.event_game_result || '-',
            serve: match.event_serve || null,
            winner: match.event_winner || null,
            scores,
            stream: null,
            hasStream: false
        };
    });
};

// Parse score data
const parseScores = (match) => {
    const scores = [];

    // Try to parse from event_first_player_set fields
    for (let i = 1; i <= 5; i++) {
        const p1Set = match[`event_first_player_set${i}`];
        const p2Set = match[`event_second_player_set${i}`];

        if (p1Set !== undefined && p1Set !== '' && p2Set !== undefined && p2Set !== '') {
            scores.push({
                set: String(i),
                player1: String(p1Set),
                player2: String(p2Set)
            });
        }
    }

    return scores;
};

// Check if match is currently live
const isLiveStatus = (match) => {
    if (!match || !match.status) return false;

    const status = match.status;

    // Check live flag
    if (status.live === true || status.live === '1') return true;

    // Check status text
    const statusText = (status.short || status.long || '').toUpperCase();
    const liveKeywords = ['SET 1', 'SET 2', 'SET 3', 'SET 4', 'SET 5', 'LIVE', 'IN PROGRESS', 'PLAYING'];

    return liveKeywords.some(keyword => statusText.includes(keyword));
};

// Check if match is finished
const isFinishedStatus = (match) => {
    if (!match || !match.status) return false;

    const statusText = (match.status.short || match.status.long || '').toUpperCase();
    const finishedKeywords = ['FINISHED', 'ENDED', 'RETIRED', 'WALKOVER', 'CANCELLED', 'POSTPONED', 'AWARDED'];

    return finishedKeywords.some(keyword => statusText.includes(keyword));
};

// Assign streams to live matches
const assignStreamsToMatches = (matches) => {
    let streamIndex = 0;

    return matches.map(match => {
        // Only assign streams to LIVE matches
        if (isLiveStatus(match) && !isFinishedStatus(match)) {
            // Rotate through available channels
            const channel = TENNIS_CHANNELS[streamIndex % TENNIS_CHANNELS.length];
            streamIndex++;

            return {
                ...match,
                stream: {
                    id: channel.stream_id,
                    name: channel.name,
                    quality: channel.quality,
                    allChannels: TENNIS_CHANNELS // Include all channels so user can switch
                },
                hasStream: true
            };
        }

        return match;
    });
};

// Get single match by ID
const getTennisMatch = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch from main endpoint
        const response = await getTennisMatchesInternal();
        const match = response.matches.find(m => String(m.id) === String(id));

        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found'
            });
        }

        res.json({
            success: true,
            match,
            availableChannels: TENNIS_CHANNELS
        });

    } catch (error) {
        console.error('Tennis Match Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tennis match',
            message: error.message
        });
    }
};

// Internal function to get matches (for reuse)
const getTennisMatchesInternal = async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (date) => date.toISOString().split('T')[0];

    // Fetch live matches
    const liveResponse = await axios.get(TENNIS_API_URL, {
        params: {
            method: 'get_livescore',
            APIkey: TENNIS_API_KEY
        }
    });

    // Fetch fixtures
    const fixturesResponse = await axios.get(TENNIS_API_URL, {
        params: {
            method: 'get_fixtures',
            APIkey: TENNIS_API_KEY,
            date_start: formatDate(today),
            date_stop: formatDate(tomorrow)
        }
    });

    const liveMatches = processMatches(liveResponse.data?.result || [], true);
    const fixtures = processMatches(fixturesResponse.data?.result || [], false);

    const liveIds = new Set(liveMatches.map(m => m.id));
    const allMatches = [
        ...liveMatches,
        ...fixtures.filter(m => !liveIds.has(m.id))
    ];

    allMatches.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });

    const matchesWithStreams = assignStreamsToMatches(allMatches);

    return {
        matches: matchesWithStreams,
        liveCount: matchesWithStreams.filter(m => isLiveStatus(m)).length,
        withStreams: matchesWithStreams.filter(m => m.hasStream).length
    };
};

module.exports = {
    getTennisMatches,
    getTennisMatch
};
