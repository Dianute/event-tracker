const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8080;
const DB_PATH = path.join(__dirname, 'events.db');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Initialize Schema
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error initializing schema:', err);
            } else {
                console.log('Schema initialized.');
            }
        });
    }
});

// Routes

// GET / - Health Check
app.get('/', (req, res) => {
    res.send('<h1>Event Tracker Backend is Running 🟢</h1><p>Go to <a href="/events">/events</a> to see data.</p>');
});

// GET /events - Fetch all active events
app.get('/events', (req, res) => {
    db.all("SELECT * FROM events", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /events - Create a new event
app.post('/events', (req, res) => {
    const { title, description, type, lat, lng, startTime, endTime, venue, date, link } = req.body;
    const id = uuidv4();

    const query = `INSERT INTO events (id, title, description, type, lat, lng, startTime, endTime, venue, date, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [id, title, description, type, lat, lng, startTime, endTime, venue, date, link];

    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id, title, description, type, lat, lng, startTime, endTime, venue, date, link
        });
    });
});

// DELETE /events/:id - Delete an event
app.delete('/events/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM events WHERE id = ?", id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Deleted", changes: this.changes });
    });
});

// GET /targets - Get all scout targets
app.get('/targets', (req, res) => {
    fs.readFile(path.join(__dirname, 'targets.json'), 'utf8', (err, data) => {
        if (err) return res.json([]);
        res.json(JSON.parse(data));
    });
});

// POST /targets - Add new target
app.post('/targets', (req, res) => {
    const newTarget = req.body; // { name, url, selector }
    const file = path.join(__dirname, 'targets.json');

    fs.readFile(file, 'utf8', (err, data) => {
        const targets = err ? [] : JSON.parse(data);
        targets.push({ id: uuidv4(), ...newTarget });
        fs.writeFile(file, JSON.stringify(targets, null, 2), () => res.json({ success: true }));
    });
});

// POST /scout/run - Run the Scout Agent
app.post('/scout/run', (req, res) => {
    const { spawn } = require('child_process');
    console.log("🚀 Triggering Scout Agent...");

    const scout = spawn('node', ['scout.js'], { cwd: __dirname });

    scout.stdout.on('data', (data) => console.log(`Scout: ${data}`));
    scout.stderr.on('data', (data) => console.error(`Scout Error: ${data}`));

    scout.on('close', (code) => {
        console.log(`Scout finished with code ${code}`);
    });

    res.json({ message: "Scout Agent started!" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
