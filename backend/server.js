
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('<h1>Event Tracker Backend is Running 🟢 (Diagnostics Mode)</h1>');
});

// Health check endpoint for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Diagnostics Server running on port ${PORT}`);
});
