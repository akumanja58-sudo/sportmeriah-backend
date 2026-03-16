const express = require('express');
const router = express.Router();
const { getMotorsportEvents, getStreamInfo } = require('../controllers/motorsportController');

// GET /api/motorsport - Get all motorsport events & channels
router.get('/', getMotorsportEvents);

// GET /api/motorsport/stream/:streamId - Get stream info by ID
router.get('/stream/:streamId', getStreamInfo);

module.exports = router;
