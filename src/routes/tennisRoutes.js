const express = require('express');
const router = express.Router();
const { getTennisEvents, getStreamInfo } = require('../controllers/tennisController');

// GET /api/tennis - Get all tennis events & channels
router.get('/', getTennisEvents);

// GET /api/tennis/stream/:streamId - Get stream info by ID
router.get('/stream/:streamId', getStreamInfo);

module.exports = router;
