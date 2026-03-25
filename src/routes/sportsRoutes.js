const express = require('express');
const router = express.Router();
const {
    SPORTS,
    getAllSports,
    createSportHandler,
    createStreamHandler
} = require('../controllers/sportsController');

// GET /api/sports - List all available sports with channel counts
router.get('/', getAllSports);

// Auto-register routes for each sport defined in SPORTS config
// Creates:
//   GET /api/sports/:slug         → sport channels & events
//   GET /api/sports/:slug/stream/:streamId → stream info
Object.keys(SPORTS).forEach(slug => {
    router.get(`/${slug}`, createSportHandler(slug));
    router.get(`/${slug}/stream/:streamId`, createStreamHandler(slug));
});

module.exports = router;
