const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

// Start stream
router.get('/start/:id', streamController.startStream);

// Stop stream
router.get('/stop/:id', streamController.stopStream);

// Get all streams status
router.get('/status', streamController.getStatus);

// Get specific stream status
router.get('/status/:id', streamController.getStreamStatus);

module.exports = router;
