const express = require('express');
const router = express.Router();
const {
    getFootballMatches,
    getFootballMatch,
    getFootballStream
} = require('../controllers/footballController');

// GET /api/football - Get all matches with streams
router.get('/', getFootballMatches);

// GET /api/football/match/:id - Get single match by fixture ID
router.get('/match/:id', getFootballMatch);

// GET /api/football/stream/:streamId - Get stream info by stream ID
router.get('/stream/:streamId', getFootballStream);

module.exports = router;
