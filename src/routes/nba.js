const express = require('express');
const router = express.Router();
const nbaController = require('../controllers/nbaController');

// GET /api/nba - Get NBA matches with streams
router.get('/', nbaController.getNbaMatches);

// GET /api/nba/live - Get only live NBA matches
router.get('/live', nbaController.getLiveNbaMatches);

// GET /api/nba/today - Get today's NBA matches
router.get('/today', nbaController.getTodayNbaMatches);

module.exports = router;
