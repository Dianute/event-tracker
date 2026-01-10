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
    createdAt TIMESTAMP DEFAULT NOW()
);

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
