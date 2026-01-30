const express = require('express');
const router = express.Router();
const {
    getTennisMatches,
    getLiveTennisMatches,
    getTodayTennisMatches
} = require('../controllers/tennisController');

// GET /api/tennis - Get all tennis matches (today + tomorrow)
router.get('/', getTennisMatches);

// GET /api/tennis/live - Get only live tennis matches
router.get('/live', getLiveTennisMatches);

// GET /api/tennis/today - Get today's active tennis matches
router.get('/today', getTodayTennisMatches);

module.exports = router;
