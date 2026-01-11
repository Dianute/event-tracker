CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    startTime TEXT,
    endTime TEXT,
    venue TEXT,
    date TEXT,
    link TEXT,
    imageUrl TEXT,
    userEmail TEXT,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Migration for existing tables
ALTER TABLE events ADD COLUMN IF NOT EXISTS userEmail TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS scout_logs (
    id TEXT PRIMARY KEY,
    startTime TIMESTAMP DEFAULT NOW(),
    endTime TIMESTAMP,
    status TEXT, -- 'RUNNING', 'SUCCESS', 'FAILED'
    eventsFound INTEGER DEFAULT 0,
    logSummary TEXT
);

CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    city TEXT,
    selector TEXT,
    lastEventsFound INTEGER DEFAULT 0,
    lastScrapedAt TIMESTAMP
);
