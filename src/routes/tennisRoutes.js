const express = require('express');
const router = express.Router();
const {
    getTennisMatches,
    getTennisMatch
} = require('../controllers/tennisController');

// GET /api/tennis - Get all tennis matches (today + tomorrow with streams)
router.get('/', getTennisMatches);

// GET /api/tennis/:id - Get single match by ID
router.get('/:id', getTennisMatch);

module.exports = router;
