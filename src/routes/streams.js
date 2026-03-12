const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

// ========================
// PearlIPTV (Bola/Football)
// ========================
router.get('/pearl/start/:id', streamController.startPearlStream);
router.get('/pearl/stop/:id', streamController.stopPearlStream);
router.get('/pearl/stop-all', streamController.stopAllPearlStreams);
router.get('/pearl/status', streamController.getPearlStatus);
router.get('/pearl/status/:id', streamController.getPearlStreamStatus);

// ========================
// SphereIPTV (Basketball, Tennis, Hockey, dll)
// ========================
router.get('/sphere/start/:id', streamController.startSphereStream);
router.get('/sphere/stop/:id', streamController.stopSphereStream);
router.get('/sphere/stop-all', streamController.stopAllSphereStreams);
router.get('/sphere/status', streamController.getSphereStatus);
router.get('/sphere/status/:id', streamController.getSphereStreamStatus);

// ========================
// Global (All Providers)
// ========================
router.get('/status', streamController.getStatus);
router.get('/stop-all', streamController.stopAllStreams);

module.exports = router;
