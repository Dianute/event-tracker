const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db'); // NEW: PostgreSQL Pool

const app = express();
const PORT = process.env.PORT || 8080;

if (!process.env.DATABASE_URL) {
    console.warn("⚠️ WARNING: DATABASE_URL is missing! Database connections will fail.");
} else {
    console.log("✅ DATABASE_URL is present.");
}

// Helper to convert snake_case (Postgres defaults) to camelCase
const toCamelCase = (row) => {
    const newRow = {};
    for (const key in row) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) // snake_to_camel if needed
            .replace(/starttime/g, 'startTime')
            .replace(/endtime/g, 'endTime')
            .replace(/imageurl/g, 'imageUrl')
            .replace(/useremail/g, 'userEmail')
            .replace(/createdat/g, 'createdAt');
        newRow[camelKey] = row[key];
    }
    // Backup: If explicit replacement missed, we can rely on manual aliases in queries in future, 
    // but for now, let's just fix the specific ones we know broke.
    // Actually, Postgres lowercases 'startTime' to 'starttime'.
    // So we just need to map 'starttime' -> 'startTime'.
    return newRow;
};

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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password', 'x-user-email']
}));
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    res.header("Access-Control-Allow-Origin", "*"); // FORCE CORS
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-password, x-user-email");
    next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Initialize Schema (Check if tables exist)
(async () => {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to run individually (simple migration)
        const statements = schemaSql.split(';').filter(s => s.trim());
        for (const statement of statements) {
            await db.query(statement);
        }

        // --- EXPLICIT MIGRATIONS (Force Schema Update) ---
        try {
            await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS phone TEXT");
            await db.query("ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS phone TEXT");
            // New Analytics Columns
            // New Analytics Columns
            await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS clicks_location INT DEFAULT 0");
            await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS clicks_phone INT DEFAULT 0");

            // --- USER MODERATION SYSTEM ---
            // 1. Users Table
            await db.query(`CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                is_blocked BOOLEAN DEFAULT FALSE,
                is_trusted BOOLEAN DEFAULT FALSE,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW()
            )`);

            // Add is_trusted if table existed before
            await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT FALSE");

            // 2. Event Status
            await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");

            // 3. Auto-Approve existing events (Migration)
            await db.query("UPDATE events SET status = 'approved' WHERE status IS NULL OR status = 'pending'");

            console.log("✅ Schema patched successfully (Analytics + Users + Moderation)");
        } catch (migErr) {
            console.warn("⚠️ Schema patch warning:", migErr.message);
        }

        // --- HIGH PERFORMANCE INDEXES (Added for 100k+ Scale) ---
        // 1. Spatial Index for fast map lookups
        await db.query(`CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (lat, lng);`);
        // 2. Time Index for feed sorting
        await db.query(`CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (startTime);`);
        // 3. Email Index for "My Templates" & Analytics
        await db.query(`CREATE INDEX IF NOT EXISTS idx_events_user_email ON events (userEmail);`);
        // 4. Analytics Indexes
        await db.query(`CREATE INDEX IF NOT EXISTS idx_events_views ON events (views);`);

        console.log("✅ Database initialized & Optimized for Scale");
    } catch (err) {
        console.error('❌ Error initializing schema:', err);
    }
})();

// Routes

// AUTHENTICATION
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
console.log(`🔐 Admin Password Set: ${process.env.ADMIN_PASSWORD ? '***' : 'Default (admin123)'}`);

const requireAuth = (req, res, next) => {
    const authHeader = req.headers['x-admin-password'];
    if (authHeader === ADMIN_PASSWORD) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid Password' });
};

// POST /api/auth/verify - Verify password from frontend
app.post('/api/auth/verify', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// GET / - Health Check
app.get('/', (req, res) => {
    res.send('<h1>Event Tracker Backend is Running 🟢 (Postgres)</h1><p>Go to <a href="/events">/events</a> to see data.</p>');
});

// GET /api/health-db - Explicit DB Check
app.get('/api/health-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() as now');
        res.json({ status: 'ok', time: result.rows[0].now, env: process.env.DATABASE_URL ? 'Set' : 'Missing' });
    } catch (err) {
        // Serialize full error object including non-enumerable properties like 'message', 'stack', 'errors'
        const errorDetails = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        const envStatus = process.env.DATABASE_URL ? 'Set' : 'MISSING (Defaults to localhost)';

        res.status(500).json({ status: 'error', env: envStatus, details: errorDetails });
    }
});

// Helper to check if event is active (ends in future or ended < 15 mins ago)
const isEventActive = (endTimeStr, type) => {
    if (!endTimeStr) return true; // No end time? Keep it.

    const now = new Date();
    // Instant expiry for Food (Menus), 15 min buffer for others (Parties/Social)
    const buffer = (type === 'food') ? 0 : 15 * 60 * 1000;
    const cutoff = new Date(now.getTime() - buffer);

    let eventEnd;

    if (endTimeStr.endsWith('Z')) {
        eventEnd = new Date(endTimeStr);
    } else {
        const parsed = new Date(endTimeStr);
        eventEnd = new Date(parsed.getTime() - (2 * 60 * 60 * 1000)); // Subtract 2 hours
    }

    return eventEnd > cutoff;
};

// GET /events - Fetch events (Active or History)
app.get('/events', async (req, res) => {
    try {
        const { history } = req.query; // ?history=true

        // Fetch all events
        // TODO: Move filtering to SQL for performance, but for now JS filter is fine for <10k events
        const { rows } = await db.query("SELECT * FROM events");

        // Convert casing
        const formattedRows = rows.map(toCamelCase);

        let resultEvents = formattedRows;

        // --- MODERATION FILTER ---
        // Default: Show only APPROVED (or null)
        // If ?status=pending (Admin) -> Show pending
        // If ?status=all (Admin) -> Show all
        // If ?userEmail=... (My Dashboard) -> Show all MY events
        const { status: statusFilter, userEmail: filterEmail } = req.query;

        if (filterEmail) {
            // Dashboard: Show my events regardless of status
            // Already filtered by client logic usually, but let's just pass them through here if specifically requested by email
            // Actually, the main /events calls don't filter by SQL userEmail yet.
            // Let's implement the logic: If request is just generic /events, filter approved.
        } else if (statusFilter === 'pending') {
            resultEvents = resultEvents.filter(e => e.status === 'pending');
        } else if (statusFilter === 'all') {
            // Show all
        } else {
            // Public Feed: Approved Only
            resultEvents = resultEvents.filter(e => !e.status || e.status === 'approved');
        }


        if (history === 'true') {
            // HISTORY: Return events that are NOT active (ended)
            // Note: History logic shouldn't care about the buffer, ideally pure history.
            // But to be consistent with "Disappeared from map", we use the same check negated.
            resultEvents = resultEvents.filter(ev => !isEventActive(ev.endTime, ev.type));
        } else {
            // DEFAULT: Active events only
            resultEvents = resultEvents.filter(ev => isEventActive(ev.endTime, ev.type));
        }

        res.json(resultEvents);
    } catch (err) {
        console.error("GET /events error:", err);
        res.status(500).json({ error: String(err.message || err) });
    }
});

// ... (Upload routes remain same) ...



// POST /upload - Handle Image Upload (PUBLIC) -> TO BASE 64 (PERSISTENT)
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        // Optimize Image (Resize & Convert to WebP buffer)
        const buffer = await sharp(req.file.buffer)
            .rotate()
            .resize({ width: 1600, withoutEnlargement: true }) // Increased to 1600px for better detail
            .webp({ quality: 85 }) // Increased quality for readable text
            .toBuffer();

        // Convert to Base64 Data URI
        const base64 = buffer.toString('base64');
        const imageUrl = `data:image/webp;base64,${base64}`;

        // Return Base64 String (Saved directly to DB later)
        res.json({ success: true, imageUrl });
    } catch (err) {
        console.error("Image processing failed:", err);
        res.status(500).json({ error: "Image processing failed" });
    }
});

// Helper: Download External Image -> RETURN BASE64
const downloadImage = async (url) => {
    try {
        const axios = require('axios'); // Lazy load
        const response = await axios({ url, responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Process to Base64
        const processedBuffer = await sharp(buffer)
            .resize({ width: 1280, withoutEnlargement: true }) // Increased for auto-scraped content
            .webp({ quality: 80 })
            .toBuffer();

        return `data:image/webp;base64,${processedBuffer.toString('base64')}`;
    } catch (e) {
        console.error("Failed to download image:", url, e.message);
        return null;
    }
};

// POST /events - Create a new event (PUBLIC)
app.post('/events', async (req, res) => {
    let { title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl, userEmail, phone } = req.body;

    // AUTO-DOWNLOAD
    if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('data:image')) {
        console.log(`📥 Auto-Downloading Image: ${imageUrl}`);
        const base64Image = await downloadImage(imageUrl);
        if (base64Image) {
            imageUrl = base64Image;
            console.log(`✅ Converted to Base64 (${imageUrl.length} chars)`);
        }
    }

    try {
        // Check for duplicates
        let checkSql, checkParams;
        if (link) {
            checkSql = `SELECT id FROM events WHERE link = $1 OR (title = $2 AND startTime = $3)`;
            checkParams = [link, title, startTime];
        } else {
            checkSql = `SELECT id FROM events WHERE title = $1 AND startTime = $2`;
            checkParams = [title, startTime];
        }

        const { rows: existing } = await db.query(checkSql, checkParams);
        if (existing.length > 0) {
            return res.json({ message: "Event already exists", id: existing[0].id });
        }

        // --- MODERATION LOGIC ---
        // 1. Sync User & Check Block Status
        let userStatus = 'pending';
        if (userEmail) {
            // Upsert User (Ensure they exist)
            await db.query(`INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [userEmail]);

            // Check Block Status
            const { rows: userRows } = await db.query("SELECT is_blocked, role FROM users WHERE email = $1", [userEmail]);
            if (userRows[0] && userRows[0].is_blocked) {
                return res.status(403).json({ error: "Your account has been restricted. Please contact support." });
            }

            // If Admin Header is present, auto-approve
            if (adminPass === ADMIN_PASSWORD || (userRows[0] && userRows[0].role === 'admin')) {
                userStatus = 'approved';
            }
        } else {
            // Anonymous posts (if allowed) - pending by default
            userStatus = 'pending';
        }

        const id = uuidv4();
        let newEvent;
        try {
            const query = `INSERT INTO events (id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl, userEmail, phone, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`;
            const params = [id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl, userEmail, phone, userStatus];
            const { rows } = await db.query(query, params);
            newEvent = rows;
        } catch (insertErr) {
            console.warn("⚠️ Insert failed, retrying fallback...", insertErr.message);
            // Fallback for schemas missing 'phone' or 'status' (should be covered by migration, but safety first)
            // Note: If 'status' is missing, this backup query will work but result in NULL status (which we handled in GET).
            const queryFallback = `INSERT INTO events (id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl, userEmail) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;
            const paramsFallback = [id, title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl, userEmail];
            const { rows } = await db.query(queryFallback, paramsFallback);
            newEvent = rows;
        }

        // Auto-save location for user (if provided)
        if (venue && lat && lng && userEmail) {
            try {
                const locationName = title; // Use event title as location name
                const { rows: existingLoc } = await db.query(
                    'SELECT id FROM user_locations WHERE userEmail = $1 AND venue = $2',
                    [userEmail, venue]
                );

                if (existingLoc.length > 0) {
                    // Update existing location (and add phone if new)
                    const updateSql = phone
                        ? 'UPDATE user_locations SET usageCount = usageCount + 1, lastUsed = NOW(), phone = $1 WHERE id = $2'
                        : 'UPDATE user_locations SET usageCount = usageCount + 1, lastUsed = NOW() WHERE id = $1'; // Don't wipe existing phone if new event has none

                    const updateParams = phone ? [phone, existingLoc[0].id] : [existingLoc[0].id];
                    await db.query(updateSql, updateParams);
                } else {
                    // Insert new location
                    const locationId = uuidv4();
                    await db.query(
                        'INSERT INTO user_locations (id, userEmail, name, venue, lat, lng, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                        [locationId, userEmail, locationName, venue, lat, lng, phone]
                    );
                }
            } catch (locErr) {
                console.error('Failed to auto-save location:', locErr);
                // Don't fail the event creation if location save fails
            }
        }

        res.json(toCamelCase(newEvent[0]));

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /events/:id - Update an event
app.put('/events/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl } = req.body;
    const adminPass = req.headers['x-admin-password'];
    const userEmail = req.headers['x-user-email'];

    try {
        // Ownership Check
        if (adminPass !== ADMIN_PASSWORD) {
            const { rows } = await db.query("SELECT userEmail FROM events WHERE id = $1", [id]);
            if (rows.length === 0) return res.status(404).json({ error: "Event not found" });
            if (!userEmail || rows[0].userEmail !== userEmail) {
                return res.status(401).json({ error: "Unauthorized: You don't own this event" });
            }
        }

        const query = `UPDATE events SET title = $1, description = $2, type = $3, lat = $4, lng = $5, startTime = $6, endTime = $7, venue = $8, date = $9, link = $10, imageUrl = $11 WHERE id = $12`;
        const params = [title, description, type, lat, lng, startTime, endTime, venue, date, link, imageUrl, id];

        const { rowCount } = await db.query(query, params);
        res.json({ success: true, changes: rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /events/:id - Delete an event
app.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    const adminPass = req.headers['x-admin-password'];
    const userEmail = req.headers['x-user-email'];

    try {
        // Ownership Check
        if (adminPass !== ADMIN_PASSWORD) {
            const { rows: meta } = await db.query("SELECT userEmail, imageUrl FROM events WHERE id = $1", [id]);
            if (meta.length === 0) return res.status(404).json({ error: "Event not found" });
            if (!userEmail || meta[0].userEmail !== userEmail) {
                return res.status(401).json({ error: "Unauthorized: You don't own this event" });
            }
        }

        const { rows } = await db.query("SELECT imageUrl FROM events WHERE id = $1", [id]);

        if (rows.length > 0 && rows[0].imageUrl) {
            try {
                const urlParts = rows[0].imageUrl.split('/uploads/');
                if (urlParts.length > 1) {
                    const filename = urlParts[1];
                    const filePath = path.join(__dirname, 'public', 'uploads', filename);
                    fs.unlink(filePath, (e) => {
                        if (e && e.code !== 'ENOENT') console.log(`Deleted image: ${filename}`);
                    });
                }
            } catch (e) {
                console.error("Error processing image deletion:", e);
            }
        }

        const { rowCount } = await db.query("DELETE FROM events WHERE id = $1", [id]);
        res.json({ message: "Deleted", changes: rowCount });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== USER LOCATIONS API ====================

// GET /api/user-locations - Fetch user's saved locations
app.get('/api/user-locations', async (req, res) => {
    const userEmail = req.headers['x-user-email'];
    const adminPass = req.headers['x-admin-password'];

    // Allow if either User Email OR Admin Password is valid
    if (!userEmail && adminPass !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized: x-user-email or Admin Password required' });
    }

    try {
        let query = 'SELECT * FROM user_locations WHERE userEmail = $1 ORDER BY lastUsed DESC';
        let params = [userEmail];

        // Admin Fallback: If no user email but valid admin pass, show ALL locations
        if (!userEmail && adminPass === ADMIN_PASSWORD) {
            query = 'SELECT * FROM user_locations ORDER BY lastUsed DESC LIMIT 100';
            params = [];
        }

        const { rows } = await db.query(query, params);
        res.json(rows.map(toCamelCase));
    } catch (err) {
        console.error('GET /api/user-locations error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/user-locations - Save or update a location
app.post('/api/user-locations', async (req, res) => {
    const userEmail = req.headers['x-user-email'];
    const { name, venue, lat, lng, phone } = req.body;

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized: x-user-email header required' });
    }

    if (!name || !venue) {
        return res.status(400).json({ error: 'Missing required fields: name, venue' });
    }

    try {
        // Check if location already exists for this user (by venue)
        const { rows: existing } = await db.query(
            'SELECT id, usageCount FROM user_locations WHERE userEmail = $1 AND venue = $2',
            [userEmail, venue]
        );

        if (existing.length > 0) {
            // Update existing location
            const { rows } = await db.query(
                'UPDATE user_locations SET name = $1, lat = $2, lng = $3, phone = $4, usageCount = usageCount + 1, lastUsed = NOW() WHERE id = $5 RETURNING *',
                [name, lat, lng, phone, existing[0].id]
            );
            res.json({ success: true, location: toCamelCase(rows[0]), updated: true });
        } else {
            // Insert new location
            const id = uuidv4();
            const { rows } = await db.query(
                'INSERT INTO user_locations (id, userEmail, name, venue, lat, lng, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [id, userEmail, name, venue, lat, lng, phone]
            );
            res.json({ success: true, location: toCamelCase(rows[0]), updated: false });
        }
    } catch (err) {
        console.error('POST /api/user-locations error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/user-locations/:id - Delete a saved location
app.delete('/api/user-locations/:id', async (req, res) => {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'];

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized: x-user-email header required' });
    }

    try {
        // Ownership check
        const { rows } = await db.query('SELECT userEmail FROM user_locations WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }
        if (rows[0].useremail !== userEmail) {
            return res.status(401).json({ error: 'Unauthorized: You don\'t own this location' });
        }

        await db.query('DELETE FROM user_locations WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/user-locations error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== ANALYTICS API ====================ENDPOINTS ---

// POST /api/analytics/view - Batch Increment Views
app.post('/api/analytics/view', async (req, res) => {
    const { eventIds } = req.body; // Expects array of IDs
    if (!Array.isArray(eventIds) || eventIds.length === 0) return res.json({ success: true });

    try {
        // High-Performance Bulk Update (Handles 10k+ users easily)
        // Instead of running 20 queries for 20 events, we run ONE single query.
        await db.query(`
            UPDATE events 
            SET views = COALESCE(views, 0) + 1 
            WHERE id = ANY($1::text[])
        `, [eventIds]);

        res.json({ success: true, count: eventIds.length });
    } catch (err) {
        console.error("Analytics Error (View):", err);
        res.status(500).json({ error: "Failed to track views" });
    }
});

// POST /api/analytics/click - Increment Click
app.post('/api/analytics/click', async (req, res) => {
    const { eventId, type } = req.body;
    if (!eventId) return res.status(400).json({ error: "No Event ID" });

    try {
        // Map type to column (Whitelist for security)
        const columnMap = {
            'location': 'clicks_location',
            'phone': 'clicks_phone',
            'default': 'clicks'
        };
        const targetCol = columnMap[type] || columnMap.default;

        // Safe interpolation since we control the targetCol string from strict map
        await db.query(`UPDATE events SET ${targetCol} = COALESCE(${targetCol}, 0) + 1 WHERE id = $1`, [eventId]);

        res.json({ success: true, type: targetCol });
    } catch (err) {
        console.error("Analytics Error (Click):", err);
        res.status(500).json({ error: "Failed to track click" });
    }
});

const { exec } = require('child_process');

// API: Preview Link
app.post('/api/preview-link', requireAuth, (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!url.startsWith('http')) return res.status(400).json({ error: 'Invalid URL' });

    const scriptPath = path.join(__dirname, 'preview.js');
    exec(`node "${scriptPath}" "${url}"`, { timeout: 45000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to preview link', details: stderr });
        }
        try {
            const data = JSON.parse(stdout.trim());
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: 'Invalid response from scraper' });
        }
    });
});

// TARGETS API (DB-Based)
// GET /targets
app.get('/targets', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM targets");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /targets
app.post('/targets', requireAuth, async (req, res) => {
    const { name, url, city, selector } = req.body;
    const id = uuidv4();
    try {
        const sql = "INSERT INTO targets (id, name, url, city, selector) VALUES ($1, $2, $3, $4, $5)";
        await db.query(sql, [id, name, url, city, selector || null]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /targets/:id
app.delete('/targets/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query("DELETE FROM targets WHERE id = $1", [id]);
        if (rowCount === 0) return res.status(404).json({ error: "Target not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /targets/:id
app.patch('/targets/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) return res.json({ success: true });

    try {
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const sql = `UPDATE targets SET ${setClause}, lastScrapedAt = NOW() WHERE id = $1`;
        await db.query(sql, [id, ...values]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== MENUS API ====================

// POST /api/menus - Save a generated menu
app.post('/api/menus', async (req, res) => {
    const userEmail = req.headers['x-user-email'];
    const { title, content, theme_config, image_url } = req.body;

    if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

    const id = uuidv4();
    try {
        await db.query(`
            INSERT INTO menus (id, user_email, title, content, theme_config, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, userEmail, title, content, theme_config, image_url]);

        res.json({ success: true, id });
    } catch (err) {
        console.error("POST /api/menus error:", err);
        res.status(500).json({ error: "Failed to save menu" });
    }
});

// GET /api/menus - List user menus
app.get('/api/menus', async (req, res) => {
    const userEmail = req.headers['x-user-email'];
    if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { rows } = await db.query(`
            SELECT * FROM menus WHERE user_email = $1 ORDER BY created_at DESC
        `, [userEmail]);
        // Convert snake_case to camelCase for frontend consistency
        const menus = rows.map(row => ({
            id: row.id,
            userEmail: row.user_email,
            title: row.title,
            content: row.content,
            themeConfig: row.theme_config,
            imageUrl: row.image_url,
            createdAt: row.created_at
        }));
        res.json(menus);
    } catch (err) {
        console.error("GET /api/menus error:", err);
        res.status(500).json({ error: "Failed to fetch menus" });
    }
});

// DELETE /api/menus/:id
app.delete('/api/menus/:id', async (req, res) => {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'];
    if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { rowCount } = await db.query(`
            DELETE FROM menus WHERE id = $1 AND user_email = $2
        `, [id, userEmail]);

        if (rowCount === 0) return res.status(404).json({ error: "Menu not found or unauthorized" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete menu" });
    }
});



// BACKUP / RESTORE (JSON)
app.get('/targets/export', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM targets");
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=targets_backup.json');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/targets/import', express.json(), async (req, res) => {
    const targets = req.body;
    if (!Array.isArray(targets)) return res.status(400).json({ error: "Invalid format. Expected array." });

    try {
        for (const t of targets) {
            const tid = t.id || uuidv4();
            const sql = `INSERT INTO targets (id, name, url, city, selector, lastEventsFound, lastScrapedAt) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         ON CONFLICT (id) DO UPDATE SET 
                         name=EXCLUDED.name, url=EXCLUDED.url, city=EXCLUDED.city, selector=EXCLUDED.selector`;
            // ON CONFLICT replacement for "INSERT OR REPLACE"
            await db.query(sql, [tid, t.name, t.url, t.city || null, t.selector || null, t.lastEventsFound || 0, t.lastScrapedAt || null]);
        }
        res.json({ success: true, count: targets.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SCOUT HISTORY
app.get('/scout/history', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM scout_logs ORDER BY startTime DESC LIMIT 50");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== ADMIN: USER MANAGEMENT ====================

// GET /api/users - List all users with stats
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        // Get users and count their events
        const query = `
            SELECT u.*, COUNT(e.id) as event_count 
            FROM users u
            LEFT JOIN events e ON u.email = e.userEmail
            GROUP BY u.email
            ORDER BY u.created_at DESC
        `;
        const { rows } = await db.query(query);
        res.json(rows.map(toCamelCase));
    } catch (err) {
        console.error("Fetch Users Error:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// PATCH /api/users/:email/block - Toggle Block
app.patch('/api/users/:email/block', requireAuth, async (req, res) => {
    const { email } = req.params;
    const { isBlocked } = req.body; // true/false

    try {
        await db.query("UPDATE users SET is_blocked = $1 WHERE email = $2", [isBlocked, decodeURIComponent(email)]);
        res.json({ success: true });
    } catch (err) {
        console.error("Block User Error:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// PATCH /api/events/:id/status - Approve/Reject
app.patch('/api/events/:id/status', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'

    try {
        await db.query("UPDATE events SET status = $1 WHERE id = $2", [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

app.post('/scout/log', async (req, res) => {
    const { id, status, eventsFound, logSummary, endTime } = req.body;
    try {
        const { rows } = await db.query("SELECT id FROM scout_logs WHERE id = $1", [id]);
        if (rows.length > 0) {
            const sql = `UPDATE scout_logs SET status = $1, eventsFound = $2, logSummary = $3, endTime = $4 WHERE id = $5`;
            await db.query(sql, [status, eventsFound, logSummary || "", endTime || null, id]);
        } else {
            const sql = `INSERT INTO scout_logs (id, status, startTime) VALUES ($1, $2, NOW())`;
            await db.query(sql, [id, status]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// RUN SCOUT endpoints (Same logic mostly)
app.post('/scout/test', (req, res) => {
    const { spawn } = require('child_process');
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });

    const scoutProcess = spawn('node', ['scout.js', `--url=${url}`, '--dry-run'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let previewData = null;

    scoutProcess.stdout.on('data', (d) => {
        const str = d.toString();
        output += str;
        if (str.includes('PREVIEW_JSON:')) {
            const match = str.match(/PREVIEW_JSON:(.*)/);
            if (match) {
                try { previewData = JSON.parse(match[1]); } catch (e) { }
            }
        }
    });
    scoutProcess.stderr.on('data', d => output += `[STDERR] ${d}`);
    scoutProcess.on('close', () => {
        if (previewData) res.json({ success: true, preview: previewData });
        else res.json({ success: false, log: output });
    });
});

app.post('/scout/run', (req, res) => {
    const { spawn } = require('child_process');
    const { url } = req.body;
    const args = ['scout.js'];
    if (url) args.push(`--url=${url}`);

    // Spawn DETACHED? No, let's keep it simple for now
    const scout = spawn('node', args, { cwd: __dirname });
    scout.stdout.on('data', d => console.log(`Scout: ${d}`));
    scout.stderr.on('data', d => console.error(`Scout Error: ${d}`));
    res.json({ message: "Scout Agent started!" });
});

// CRON
const cron = require('node-cron');
cron.schedule('0 */6 * * *', () => {
    const { spawn } = require('child_process');
    const scout = spawn('node', ['scout.js'], { cwd: __dirname });
    scout.stdout.on('data', d => console.log(`[Auto-Scout]: ${d}`));
});

// Cleanup Logic (Postgres Version) - RETENTION: 7 DAYS
const runCleanup = async () => {
    console.log("🧹 Running Auto-Cleanup Task (7 Day Retention)...");
    try {
        // Delete items older than 7 days
        // UTC
        const { rows: rowsUTC } = await db.query("SELECT id, imageUrl FROM events WHERE endTime LIKE '%Z' AND endTime::timestamp < NOW() - INTERVAL '7 days'");
        if (rowsUTC.length > 0) processCleanup(rowsUTC, "UTC");

        // Local (Simple safety net: delete anything clearly older than 7 days + buffer)
        const { rows: rowsLocal } = await db.query("SELECT id, imageUrl FROM events WHERE endTime NOT LIKE '%Z' AND endTime::timestamp < NOW() - INTERVAL '8 days'");
        if (rowsLocal.length > 0) processCleanup(rowsLocal, "Local");

    } catch (err) {
        console.error("Cleanup Query Error", err);
    }
};

const processCleanup = (rows, type) => {
    rows.forEach(async row => {
        if (row.imageUrl) {
            try {
                const parts = row.imageUrl.split('/uploads/');
                if (parts.length > 1) {
                    fs.unlink(path.join(__dirname, 'public', 'uploads', parts[1]), () => { });
                }
            } catch (e) { }
        }
        await db.query("DELETE FROM events WHERE id = $1", [row.id]);
        console.log(`[Cleanup] Deleted ${type} event: ${row.id}`);
    });
};

cron.schedule('0 * * * *', runCleanup); // Run every hour

app.get('/cleanup', (req, res) => {
    runCleanup();
    res.json({ message: "Cleanup started" });
});

app.listen(PORT, () => {
    console.log(`Backend Server connecting to Postgres on port ${PORT}`);
});
