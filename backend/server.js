const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'events.db');

// Multer Setup for Image Uploads
const multer = require('multer');
const sharp = require('sharp');
// Use Memory Storage for Sharp processing
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (processed down)
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

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

// Helper to check if event is active (ends in future or ended < 15 mins ago)
const isEventActive = (endTimeStr) => {
    if (!endTimeStr) return true; // No end time? Keep it.

    const now = new Date();
    const buffer = 15 * 60 * 1000; // 15 mins
    const cutoff = new Date(now.getTime() - buffer);

    let eventEnd;

    if (endTimeStr.endsWith('Z')) {
        // UTC String - Standard
        eventEnd = new Date(endTimeStr);
    } else {
        // Local String (e.g., "2024-12-21 19:00")
        // Node.js (UTC env) parses this as "19:00 UTC".
        // BUT it is actually "19:00 Local" (17:00 UTC).
        // So the server sees it as 2 hours LATER than reality.
        // We must compensate by subtracting 2 hours (or 3 for DST, but 2 is safer/close enough).
        const parsed = new Date(endTimeStr);
        eventEnd = new Date(parsed.getTime() - (2 * 60 * 60 * 1000)); // Subtract 2 hours
    }

    return eventEnd > cutoff;
};

// GET /events - Fetch all active events
app.get('/events', (req, res) => {
    // 1. Fetch mostly everything (Optimization: Don't load ancient history)
    // SQL: Just get things that have a date string (simple text compare for vague bound)
    db.all("SELECT * FROM events WHERE substr(endTime, 1, 4) >= '2024'", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // 2. Javascript Filtering (Accurate)
        const activeEvents = rows.filter(ev => isEventActive(ev.endTime));

        res.json(activeEvents);
    });
});

// POST /upload - Handle Image Upload
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        const filename = `${uuidv4()}.webp`;
        const outputPath = path.join(__dirname, 'public', 'uploads', filename);

        // Ensure dir exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Compress: Auto-Rotate (EXIF), Resize to max 1200px width, Convert to WebP, 80% Quality
        await sharp(req.file.buffer)
            .rotate() // <--- Fixes orientation
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);

        const forwardedProto = req.get('x-forwarded-proto') || 'http';
        const host = req.get('host');
        const imageUrl = `${forwardedProto}://${host}/uploads/${filename}`;

        res.json({ success: true, imageUrl });
    } catch (err) {
        console.error("Image processing failed:", err);
        res.status(500).json({ error: "Image processing failed" });
    }
});

// POST /events - Create a new event
app.post('/events', (req, res) => {
    const { title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl } = req.body;

    // Check for duplicates (same LINK or same TITLE+DATE)
    const checkSql = `SELECT id FROM events WHERE link = ? OR (title = ? AND startTime = ?)`;
    db.get(checkSql, [link || 'N/A', title, startTime], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            // Already exists, return existing
            return res.json({ message: "Event already exists", id: row.id });
        }

        const id = uuidv4();
        // Updated query to include imageUrl
        const query = `INSERT INTO events (id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl];

        db.run(query, params, function (err) {
            if (err) {
                // If error is about missing column, we might need migration (manual for now)
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl
            });
        });
    });
});

// DELETE /events/:id - Delete an event
app.delete('/events/:id', (req, res) => {
    const { id } = req.params;

    // First get the event to check for image
    db.get("SELECT imageUrl FROM events WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error fetching event for deletion:", err);
            // Continue to delete anyway? Or fail? Let's fail safe.
            return res.status(500).json({ error: err.message });
        }

        if (row && row.imageUrl) {
            try {
                // Extract filename from URL (e.g. http://host/uploads/uuid.jpg -> uuid.jpg)
                const urlParts = row.imageUrl.split('/uploads/');
                if (urlParts.length > 1) {
                    const filename = urlParts[1];
                    const filePath = path.join(__dirname, 'public', 'uploads', filename);

                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                            console.error(`Failed to delete image ${filename}:`, unlinkErr);
                        } else {
                            console.log(`Deleted image: ${filename}`);
                        }
                    });
                }
            } catch (e) {
                console.error("Error processing image deletion:", e);
            }
        }

        // Proceed to delete event
        db.run("DELETE FROM events WHERE id = ?", id, function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: "Deleted", changes: this.changes });
        });
    });
});

// TARGETS API (DB-Based)

// GET /targets - Get all scout targets
app.get('/targets', (req, res) => {
    db.all("SELECT * FROM targets", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /targets - Add new target
app.post('/targets', (req, res) => {
    const { name, url, city, selector } = req.body;
    const id = uuidv4();
    const sql = "INSERT INTO targets (id, name, url, city, selector) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [id, name, url, city, selector || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
    });
});

// DELETE /targets/:id - Remove a target
app.delete('/targets/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM targets WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Target not found" });
        res.json({ success: true });
    });
});

// PATCH /targets/:id - Update target stats
app.patch('/targets/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body; // Expects { lastEventsFound, lastScrapedAt }

    // Dynamic query builder
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    if (!fields) return res.json({ success: true }); // No updates

    const sql = `UPDATE targets SET ${fields} WHERE id = ?`;
    db.run(sql, [...values, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// INITIAL MIGRATION (JSON -> DB)
const migrateTargets = () => {
    // Check if DB targets are empty
    db.get("SELECT COUNT(*) as count FROM targets", (err, row) => {
        if (err) return console.error("Migration Check Error:", err);

        if (row.count === 0) {
            const jsonPath = path.join(__dirname, 'targets.json');
            if (fs.existsSync(jsonPath)) {
                console.log("📦 Migrating targets.json to SQLite...");
                try {
                    const data = fs.readFileSync(jsonPath, 'utf8');
                    const targets = JSON.parse(data);

                    const stmt = db.prepare("INSERT INTO targets (id, name, url, city, selector, lastEventsFound, lastScrapedAt) VALUES (?, ?, ?, ?, ?, ?, ?)");

                    targets.forEach(t => {
                        // Use existing ID if present, else gen new
                        const tid = t.id || uuidv4();
                        stmt.run(tid, t.name, t.url, t.city || null, t.selector || null, t.lastEventsFound || 0, t.lastScrapedAt || null);
                    });

                    stmt.finalize();
                    console.log(`✅ Migrated ${targets.length} targets to DB.`);

                    // Optional: Rename json file to avoid confusion?
                    // fs.renameSync(jsonPath, jsonPath + '.bak');
                } catch (e) {
                    console.error("Migration Failed:", e);
                }
            }
        }
    });
};

// Hook into DB Startup
// (We can call this in the DB connection callback above, but let's just trigger it safely here 
// assuming DB connects fast, or better: call inside the `db.serialize` block if we reorganised code. 
// For now, a timeout or just ensuring it runs after schema init is fine.)
// DISABLED per user request (Prevents defaults from reappearing if DB is wiped)
// setTimeout(migrateTargets, 2000);

// --- BACKUP / RESTORE ---

// GET /targets/export - Download targets as JSON
app.get('/targets/export', (req, res) => {
    db.all("SELECT * FROM targets", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=targets_backup.json');
        res.json(rows);
    });
});

// POST /targets/import - Restore targets from JSON
app.post('/targets/import', express.json(), (req, res) => {
    const targets = req.body;
    if (!Array.isArray(targets)) return res.status(400).json({ error: "Invalid format. Expected array." });

    const stmt = db.prepare("INSERT OR REPLACE INTO targets (id, name, url, city, selector, lastEventsFound, lastScrapedAt) VALUES (?, ?, ?, ?, ?, ?, ?)");

    db.serialize(() => {
        targets.forEach(t => {
            const tid = t.id || uuidv4();
            stmt.run(tid, t.name, t.url, t.city || null, t.selector || null, t.lastEventsFound || 0, t.lastScrapedAt || null);
        });
        stmt.finalize();
        res.json({ success: true, count: targets.length });
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

// POST /scout/test - Test a specific URL (Dry Run)
app.post('/scout/test', (req, res) => {
    const { spawn } = require('child_process');
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });

    // Spawn scout in dry run mode
    const scoutProcess = spawn('node', ['scout.js', `--url=${url}`, '--dry-run'], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let previewData = null;

    scoutProcess.stdout.on('data', (data) => {
        const str = data.toString();
        output += str;
        // Check for preview
        if (str.includes('PREVIEW_JSON:')) {
            const match = str.match(/PREVIEW_JSON:(.*)/);
            if (match && match[1]) {
                try {
                    previewData = JSON.parse(match[1]);
                } catch (e) { console.error("Failed to parse preview JSON"); }
            }
        }
    });

    scoutProcess.stderr.on('data', (data) => {
        output += `[STDERR] ${data.toString()}`;
    });

    scoutProcess.on('close', (code) => {
        if (previewData) {
            res.json({ success: true, preview: previewData });
        } else {
            res.json({ success: false, log: output });
        }
    });
});

// POST /scout/run - Trigger the scout agent manually
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

// Schedule Auto-Cleanup every hour
// Deletes events ended > 1 hour ago
// Cleanup Function
const runCleanup = () => {
    console.log("🧹 Running Auto-Cleanup Task...");

    // Query 1: Clean UTC events (ending in 'Z')
    db.all("SELECT id, imageUrl FROM events WHERE endTime LIKE '%Z' AND endTime < datetime('now', '-15 minutes')", [], (err, rowsUTC) => {
        if (!err && rowsUTC.length > 0) processCleanup(rowsUTC, "UTC");
    });

    // Query 2: Clean Local events (NOT ending in 'Z') using 'localtime' modifier
    db.all("SELECT id, imageUrl FROM events WHERE endTime NOT LIKE '%Z' AND endTime < datetime('now', 'localtime', '-15 minutes')", [], (err, rowsLocal) => {
        if (!err && rowsLocal.length > 0) processCleanup(rowsLocal, "Local");
    });
};

const processCleanup = (rows, type) => {
    console.log(`[${type}] Found ${rows.length} expired events to delete.`);
    rows.forEach(row => {
        // Delete Image
        if (row.imageUrl) {
            try {
                const urlParts = row.imageUrl.split('/uploads/');
                if (urlParts.length > 1) {
                    const filename = urlParts[1];
                    const filePath = path.join(__dirname, 'public', 'uploads', filename);
                    fs.unlink(filePath, (e) => {
                        if (e && e.code !== 'ENOENT') console.error(`Failed to delete img ${filename}:`, e);
                    });
                }
            } catch (e) { console.error("Img cleanup error:", e); }
        }
        // Delete Record
        db.run("DELETE FROM events WHERE id = ?", [row.id], (err) => {
            if (err) console.error(`Failed to delete event ${row.id}`, err);
        });
    });
};

// Schedule: Run every MINUTE to be responsive
cron.schedule('* * * * *', runCleanup);

// Run cleanup immediately on startup
setTimeout(runCleanup, 5000); // Wait 5s for DB connection

// Manual Cleanup Endpoint (for debugging)
app.get('/cleanup', (req, res) => {
    console.log("⚠️ Manual Cleanup Triggered via API");
    runCleanup();
    res.json({ success: true, message: "Cleanup task started manually." });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
