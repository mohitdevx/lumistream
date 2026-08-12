# LumiStream 🎬

LumiStream is a premium, aesthetic, and fully optimized video streaming system. Users can host private or public screening rooms, share invite links, and watch movies together synchronized in real-time, complete with a live WebSocket chat.

The streaming engine utilizes **Adaptive Bitrate Streaming (HLS)**, transcoding original uploads into multiple output resolutions (1080p, 720p, 480p) to guarantee smooth playback regardless of connection speed.

---

## 🚀 Key Features

* **Adaptive Bitrate HLS**: Automatically encodes videos into 1080p (high), 720p (medium), and 480p (low) streams with a master `.m3u8` playlist.
* **Synchronized Playback**: WebSocket-driven sync engine keeps all room viewers aligned. If a viewer drifts by $>2$ seconds from the host, their player auto-adjusts.
* **Host Control Delegation**: The creator/host controls the main player (play, pause, seek). If the host leaves, the system dynamically reassigns the role to the next participant.
* **Real-time Live Chat**: Instant messaging, system join/leave alerts, and participant lists using Socket.io.
* **Aesthetic Dark Theme**: Tailored design utilizing the latest **Tailwind CSS v4** engine with a curated zinc & emerald dark color palette.

---

## 🛠️ Technology Stack

* **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS (v4), `hls.js` (native stream engine), Socket.io Client, Lucide Icons
* **Backend**: Node.js, Express, TypeScript, Socket.io Server, Fluent-FFmpeg, Prisma (ORM)
* **Database & Cache**: PostgreSQL, Redis
* **Containerization**: Docker, Docker Compose

---

## 📂 Project Structure

```text
lumistream/
├── backend/                  # Node.js TypeScript API & WebSocket Server
│   ├── src/
│   │   ├── index.ts          # Express Server & Socket.io Connection Logic
│   │   ├── utils/
│   │   │   ├── db.ts         # Prisma DB Helper
│   │   │   └── transcoder.ts # FFmpeg HLS Transcoding utility
│   │   └── prisma/
│   │       └── schema.prisma # DB Models
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # Vite React TypeScript Web App
│   ├── src/
│   │   ├── components/       # Custom video player, chatbox, layout, cards
│   │   ├── pages/            # Dashboard, Upload, Watchroom pages
│   │   ├── utils/            # API client and WebSocket socket references
│   │   ├── index.css         # CSS & Tailwind v4 Custom Theme Setup
│   │   └── main.tsx
│   ├── nginx.conf            # Nginx config for Docker container SPA fallback
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        # Docker composition for PostgreSQL, Redis, Backend, Frontend
├── .env                      # Global environment configurations
├── package.json              # Monorepo root configurations
└── pnpm-workspace.yaml       # pnpm workspace definition
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites

Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v20+)
* [pnpm](https://pnpm.io/) (v11+)
* [FFmpeg](https://ffmpeg.org/) (needed locally if running without Docker)
* [Docker & Docker Compose](https://www.docker.com/)

---

### 2. Local Development Setup (Manual)

#### A. Environment Variables
Create a `.env` file in the root directory (a default one has been pre-configured for you):
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lumistream?schema=public"
REDIS_URL="redis://localhost:6379"

# Frontend Envs
VITE_API_URL="http://localhost:5000"
VITE_WS_URL="http://localhost:5000"
```

#### B. Install Workspace Dependencies
Run pnpm install from the root folder:
```bash
# Approve built dependencies (Prisma engines) first
pnpm approve-builds --all
pnpm install
```

#### C. Database Migration
Ensure you have a PostgreSQL instance running locally. Then run the migrations:
```bash
cd backend
npx prisma db push
```

#### D. Start Services in Dev Mode
Run the monorepo dev script:
```bash
pnpm dev
```
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000`

---

### 3. Docker Compose Deployment (Recommended)

To run the entire stack (PostgreSQL, Redis, backend transcoder, and frontend Nginx server) in one command, simply run:

```bash
docker compose up --build
```

Docker Compose will:
1. Spin up **PostgreSQL** (port 5432) and **Redis** (port 6379) with healthchecks.
2. Build the **Backend** container, installing `ffmpeg` inside it, and run DB migrations automatically.
3. Build the **Frontend** container, compile the React bundle, and serve it via **Nginx** (port 5173).

Access the application at `http://localhost:5173`. Uploaded videos will persist inside the local `./backend/uploads` directory.
