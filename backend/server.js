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
// Middleware
app.use(cors({
    origin: '*', // Allow all for now to rule out CORS issues
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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

    // Check for duplicates (same LINK or same TITLE+DATE)
    const checkSql = `SELECT id FROM events WHERE link = ? OR (title = ? AND startTime = ?)`;
    db.get(checkSql, [link || 'N/A', title, startTime], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            // Already exists, return existing
            return res.json({ message: "Event already exists", id: row.id });
        }

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
        fs.writeFile(file, JSON.stringify(targets, null, 2), (err) => {
            if (err) return res.status(500).json({ error: "Failed to write targets file" });
            res.json({ success: true });
        });
    });
});

// DELETE /targets/:id - Remove a target
app.delete('/targets/:id', (req, res) => {
    const { id } = req.params;
    const file = path.join(__dirname, 'targets.json');

    fs.readFile(file, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Could not read targets" });

        let targets = JSON.parse(data);
        const initialLength = targets.length;

        // Loose comparison to handle string/number mismatches
        const targetId = String(id);
        targets = targets.filter(t => String(t.id) !== targetId);

        if (targets.length === initialLength) {
            return res.status(404).json({
                error: "Target not found",
                received: targetId,
                available: targets.map(t => t.id)
            });
        }

        fs.writeFile(file, JSON.stringify(targets, null, 2), (err) => {
            if (err) return res.status(500).json({ error: "Failed to write targets file" });
            res.json({ success: true });
        });
    });
});

// GET /scout/history - Get execution logs
app.get('/scout/history', (req, res) => {
    db.all("SELECT * FROM scout_logs ORDER BY startTime DESC LIMIT 50", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /scout/log - Create or Update execution log
app.post('/scout/log', (req, res) => {
    const { id, status, eventsFound, logSummary, endTime } = req.body;

    // Check if exists
    db.get("SELECT id FROM scout_logs WHERE id = ?", [id], (err, row) => {
        if (row) {
            // Update
            const sql = `UPDATE scout_logs SET status = ?, eventsFound = ?, logSummary = ?, endTime = ? WHERE id = ?`;
            db.run(sql, [status, eventsFound, logSummary || "", endTime || null, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        } else {
            // Insert (Start)
            const sql = `INSERT INTO scout_logs (id, status, startTime) VALUES (?, ?, CURRENT_TIMESTAMP)`;
            db.run(sql, [id, status], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        }
    });
});

// POST /scout/run - Run the Scout Agent
app.post('/scout/run', (req, res) => {
    const { spawn } = require('child_process');
    const { url } = req.body;
    console.log("🚀 Triggering Scout Agent...");

    // Determine path based on environment
    const scoutScript = path.join(__dirname, 'scout.js');

    // Prepare arguments
    const args = [scoutScript];
    if (url) {
        console.log(`🎯 Custom URL: ${url}`);
        args.push(`--url=${url}`);
    }

    const scout = spawn('node', args, { cwd: __dirname });

    scout.stdout.on('data', (data) => console.log(`Scout: ${data}`));
    scout.stderr.on('data', (data) => console.error(`Scout Error: ${data}`));

    scout.on('close', (code) => {
        console.log(`Scout finished with code ${code}`);
    });

    res.json({ message: "Scout Agent started!" });
});

// Import cron
const cron = require('node-cron');

// Schedule Scout to run every 6 hours (at minute 0 of hours 0, 6, 12, 18)
cron.schedule('0 */6 * * *', () => {
    console.log("⏰ Default Cron Trigger: Running Scout Agent...");
    const { spawn } = require('child_process');
    const scout = spawn('node', ['scout.js'], { cwd: __dirname });

    scout.stdout.on('data', (data) => console.log(`[Auto-Scout]: ${data}`));
    scout.stderr.on('data', (data) => console.error(`[Auto-Scout Error]: ${data}`));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
