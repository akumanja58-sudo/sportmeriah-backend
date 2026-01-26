const express = require('express');
const cors = require('cors');
require('dotenv').config();

const matchesRoutes = require('./routes/matches');
const streamsRoutes = require('./routes/streams');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/matches', matchesRoutes);
app.use('/api/streams', streamsRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'SportMeriah API is running!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});