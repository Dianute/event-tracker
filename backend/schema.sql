CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    lat REAL,
    lng REAL,
    startTime TEXT,
    endTime TEXT,
    venue TEXT,
    date TEXT,
    link TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
