const express = require('express');
const router = express.Router();
const fixturesController = require('../controllers/fixturesController');

// GET /api/fixtures/today - Get today's fixtures
router.get('/today', fixturesController.getTodayFixtures);

// GET /api/fixtures/live - Get live fixtures only
router.get('/live', fixturesController.getLiveFixtures);

// GET /api/fixtures/:id - Get fixture by ID
router.get('/:id', fixturesController.getFixtureById);

module.exports = router;
