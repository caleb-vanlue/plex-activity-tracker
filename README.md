# Plex Activity Tracker

A NestJS-based API that tracks and provides insights into your Plex media consumption habits by processing Plex webhooks. This application captures detailed information about what you're watching and listening to, providing rich statistics and history for your music, movies, and TV shows.

## Features

### Media Tracking

- **Real-time tracking** of what you're currently playing across all media types
- Captures detailed **playback statistics** including duration watched/listened
- Tracks media state (playing, paused, stopped)
- Handles all major media types:
  - **Music**: Tracks, albums, and artists
  - **Movies**: Titles, directors, studios
  - **TV Shows**: Episodes, seasons, and series

### Statistics and Insights

- **Listening/viewing statistics** broken down by timeframe (day, week, month, all-time)
- **Top content** reports:
  - Most played artists and albums
  - Most watched directors
  - Shows in progress
- Progress tracking for partial watches/listens

### API Features

- RESTful endpoints for all functionality
- Comprehensive querying options for filtering content
- Thumbnail storage and retrieval
- Swagger documentation

## API Endpoints

### Current Media

- `GET /media/current` - Get what's currently playing
- `GET /webhooks/current` - Alternative endpoint for current media

### Music

- `GET /media/tracks` - Get recently played tracks with filtering options
- `GET /media/tracks/:id` - Get a specific track by ID
- `GET /media/music/stats` - Get music listening statistics
- `GET /media/music/artists` - Get top artists
- `GET /media/music/albums` - Get top albums

### Movies

- `GET /media/movies` - Get recently watched movies with filtering options
- `GET /media/movies/:id` - Get a specific movie by ID
- `GET /media/movies/stats` - Get movie watching statistics
- `GET /media/movies/directors` - Get top directors

### TV Shows

- `GET /media/tv/episodes` - Get recently watched episodes with filtering options
- `GET /media/tv/episodes/:id` - Get a specific episode by ID
- `GET /media/tv/stats` - Get TV watching statistics
- `GET /media/tv/shows` - Get shows in progress

### Combined Stats

- `GET /media/stats` - Get combined statistics for all media types
- `GET /webhooks/stats` - Alternative endpoint for media stats

### Webhooks

- `POST /webhooks/plex` - Process Plex webhooks
- `GET /webhooks/history` - Get media playback history

## Setup

This application depends on the [File Storage API](https://github.com/caleb-vanlue/file-storage) for storing and serving media thumbnails. Make sure to set up that application first or configure an alternative storage solution.

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Plex Media Server with webhook capability
- [File Storage API](https://github.com/caleb-vanlue/file-storage) for thumbnail storage

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=plexamp_activity

# File Storage API URL (see https://github.com/caleb-vanlue/file-storage)
FILE_STORAGE_API_URL=http://localhost:3001

# App Config
PORT=3000
```

### Installation

1. Clone the repository

```bash
git clone https://github.com/caleb-vanlue/plex-activity-tracker.git
cd plex-activity-tracker
```

2. Install dependencies

```bash
npm install
```

3. Run database migrations

```bash
npm run migration:run
```

4. Start the application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Configuring Plex Webhooks

1. In Plex, go to Settings > Webhooks
2. Add a new webhook with the URL to your application:
   `http://plex-activity-tracker-api.url:3000/webhooks/plex`
3. Ensure your Plex server can reach your application

## Development

### Available Scripts

- `npm run build` - Build the application
- `npm run format` - Format code with Prettier
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run lint` - Lint code with ESLint
- `npm run test` - Run unit tests
- `npm run migration:generate` - Generate new database migrations
- `npm run migration:run` - Run database migrations
- `npm run migration:revert` - Revert last migration

### Project Structure

- `src/`
  - `media/` - Media tracking and statistics modules
  - `thumbnail/` - Thumbnail processing and storage
  - `entities/` - Database entities (Track, Movie, Episode)
  - `repositories/` - Data access layer
  - `migrations/` - Database migrations
