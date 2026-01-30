const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const fixturesRoutes = require('./routes/fixtures');
const nbaRoutes = require('./routes/nba');
const streamProxy = require('./routes/streamProxy');

app.use('/api/fixtures', fixturesRoutes);
app.use('/api/basketball', nbaRoutes);
app.use('/api/stream', streamProxy);

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'SportMeriah API',
        endpoints: {
            fixtures: '/api/fixtures/today',
            basketball: '/api/basketball',
            stream: '/api/stream/:streamId.m3u8'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
