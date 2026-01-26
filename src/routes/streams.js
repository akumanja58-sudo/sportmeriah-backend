const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

router.get('/start/:streamId/:name', streamController.startStream);
router.get('/stop/:name', streamController.stopStream);
router.get('/status', streamController.getStatus);

module.exports = router;