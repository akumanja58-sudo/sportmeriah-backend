const express = require('express');
const router = express.Router();
const {
    getBasketballMatches,
    getBasketballMatch,
    getBasketballStream
} = require('../controllers/nbaController');

// GET /api/basketball - Get all matches with streams
router.get('/', getBasketballMatches);

// GET /api/basketball/match/:id - Get single match by game ID
router.get('/match/:id', getBasketballMatch);

// GET /api/basketball/stream/:streamId - Get stream info by stream ID
router.get('/stream/:streamId', getBasketballStream);

module.exports = router;
