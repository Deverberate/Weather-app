# 🌍 Hyperlocal Pollution Monitor

Real-time air quality monitoring dashboard using live data from the [OpenAQ API](https://openaq.org). Maps pollution hotspots on an interactive map and triggers localized alerts when readings exceed WHO safety thresholds.

![Dashboard](https://img.shields.io/badge/Status-Prototype-blue)

## Features

- **Interactive Map** — Leaflet map with color-coded station markers showing real-time air quality
- **Live Data** — Ingests PM2.5, PM10, NO₂, O₃, SO₂, CO readings from OpenAQ sensors worldwide
- **Alert System** — WebSocket-powered real-time alerts when pollutant levels exceed WHO guidelines
- **Station Detail** — Click any station to see all current readings with severity indicators
- **WHO Thresholds** — Built-in WHO air quality guidelines with configurable presets (WHO/EPA)
- **Background Polling** — Automatic data refresh every 5 minutes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLite, aiohttp |
| Frontend | Next.js 14, React 18, Leaflet, Tailwind CSS |
| Data | OpenAQ v3 API (free, real-time) |
| Real-time | WebSockets |

## Prerequisites

1. **Python 3.11+**
2. **Node.js 18+**
3. **OpenAQ API Key** — Free signup at [explore.openaq.org](https://explore.openaq.org)

## Quick Start

### 1. Get your API Key

Sign up at [explore.openaq.org](https://explore.openaq.org), then find your API key in Settings.

### 2. Set up the backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example ../.env
# Edit .env and add your OPENAQ_API_KEY

# Start the backend
uvicorn backend.main:app --reload --port 8000
```

### 3. Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### 4. Open the dashboard

Visit [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Threshold configuration |
| GET | `/api/stations?min_lon=&min_lat=&max_lon=&max_lat=` | Stations in bounding box |
| GET | `/api/stations/all` | All cached stations |
| GET | `/api/stations/{id}` | Station detail |
| GET | `/api/stations/{id}/history` | Station reading history |
| GET | `/api/alerts` | Recent alerts |
| GET | `/api/alerts/hotspots` | Worst pollution readings |
| WS | `/ws/alerts` | Real-time alert stream |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAQ_API_KEY` | Your OpenAQ API key | Required |
| `POLL_INTERVAL_SECONDS` | Data refresh interval | 300 (5 min) |
| `ALERT_THRESHOLD_PRESET` | Threshold preset (`who` or `epa`) | who |
| `DATABASE_PATH` | SQLite database path | pollution_monitor.db |

## Project Structure

```
pollution-monitor/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Settings & thresholds
│   ├── models.py            # Pydantic models
│   ├── db.py                # SQLite operations
│   ├── routers/
│   │   ├── stations.py      # Station endpoints
│   │   ├── alerts.py        # Alert endpoints
│   │   └── websocket.py     # WebSocket handler
│   └── services/
│       ├── openaq_client.py # OpenAQ API wrapper
│       ├── alert_engine.py  # Threshold detection
│       └── scheduler.py     # Background polling
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Main dashboard page
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── MapView.tsx       # Interactive Leaflet map
│   │   ├── AlertPanel.tsx    # Real-time alert sidebar
│   │   ├── StationDetail.tsx # Station detail modal
│   │   ├── PollutantCard.tsx # Reading card component
│   │   ├── Header.tsx        # Dashboard header
│   │   └── Legend.tsx        # Map legend
│   ├── lib/
│   │   └── api.ts           # API client
│   └── types/
│       └── index.ts         # TypeScript types
├── .env.example
└── README.md
```

## License

MIT
