const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

// ========================
// SphereIPTV (existing - unchanged)
// ========================

// Start stream
router.get('/start/:id', streamController.startStream);

// Stop stream
router.get('/stop/:id', streamController.stopStream);

// Get all streams status
router.get('/status', streamController.getStatus);

// Get specific stream status
router.get('/status/:id', streamController.getStreamStatus);

// ========================
// PearlIPTV (NEW)
// ========================

// Start Pearl stream
router.get('/pearl/start/:id', streamController.startPearlStream);

// Stop Pearl stream
router.get('/pearl/stop/:id', streamController.stopPearlStream);

// Get all Pearl streams status
router.get('/pearl/status', streamController.getPearlStatus);

// Get specific Pearl stream status
router.get('/pearl/status/:id', streamController.getPearlStreamStatus);

module.exports = router;
