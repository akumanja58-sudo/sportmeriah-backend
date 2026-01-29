const express = require('express');
const cors = require('cors');
require('dotenv').config();

const matchesRoutes = require('./routes/matches');
const streamsRoutes = require('./routes/streams');
const footballRoutes = require('./routes/football');
const fixturesRoutes = require('./routes/fixtures');
const basketballRoutes = require('./routes/basketball'); // Basketball routes

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/matches', matchesRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/football', footballRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use('/api/basketball', basketballRoutes); // Basketball endpoint

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'SportMeriah API is running!',
        endpoints: {
            football: '/api/matches',
            basketball: '/api/basketball',
            streams: '/api/streams'
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
