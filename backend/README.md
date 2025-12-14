# Event Tracker Backend

Backend API and Scout Agent for the Event Tracker application.

## Features
- REST API for events (GET, POST, DELETE)
- Scout Agent with Puppeteer for web scraping
- SQLite database with geocoding
- Scrapes events from Kakava.lt and Bilietai.lt

## Local Development

```bash
npm install
npm run dev
```

## Deployment to Railway

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Set root directory to `backend`
5. Railway will auto-detect and deploy!

## Environment Variables

No environment variables needed - Railway handles everything automatically!

## API Endpoints

- `GET /` - Health check
- `GET /events` - Get all events
- `POST /events` - Create event
- `DELETE /events/:id` - Delete event
- `GET /targets` - Get scraping targets
- `POST /targets` - Add scraping target
- `POST /scout/run` - Run Scout Agent

## Running Scout Agent

```bash
npm run scout
```
