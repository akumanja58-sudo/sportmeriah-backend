const express = require('express');
const router = express.Router();
const footballController = require('../controllers/footballController');

// GET /api/football - Get all football streams
router.get('/', footballController.getFootballStreams);

// GET /api/football/categories - Get available categories
router.get('/categories', footballController.getFootballCategories);

// GET /api/football/category/:categoryId - Get streams by category
router.get('/category/:categoryId', footballController.getFootballByCategory);

// GET /api/football/stream/:streamId - Get single stream info
router.get('/stream/:streamId', footballController.getFootballStream);

module.exports = router;