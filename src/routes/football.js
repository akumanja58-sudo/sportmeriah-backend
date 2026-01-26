const express = require('express');
const router = express.Router();
const footballController = require('../controllers/footballController');

router.get('/live', footballController.getLiveMatches);
router.get('/today', footballController.getTodayMatches);
router.get('/league/:leagueId', footballController.getMatchesByLeague);
router.get('/match/:id', footballController.getMatchById);

module.exports = router;