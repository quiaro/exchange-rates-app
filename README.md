# Exchange Rate Dashboard

A real-time cryptocurrency exchange rate monitoring application built with React frontend and NestJS backend. The application provides live price tracking for Ethereum trading pairs with interactive charts and WebSocket connectivity.

## Project Structure

```
code-challenge/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   └── exchange-rates/ # Exchange rates module
│   │   │       ├── exchange-rates.controller.ts
│   │   │       ├── exchange-rates.module.ts
│   │   │       └── exchange-rates.controller.spec.ts
│   │   ├── services/
│   │   │   └── finnhub/        # Finnhub API integration
│   │   │       ├── finnhub.service.ts
│   │   │       ├── finnhub-mock.service.ts
│   │   │       ├── finnhub-interfaces.ts
│   │   │       └── finnhub.service.spec.ts
│   │   ├── config/
│   │   │   └── configuration.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                   # E2E tests
│   ├── dist/                   # Compiled JavaScript
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React/Vite application
│   ├── src/
│   │   ├── components/
│   │   │   └── ExchangeRateLinearChart.tsx
│   │   ├── hooks/
│   │   │   └── useSSEwithReconnect.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── dist/                   # Built assets
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── shared/                     # Shared types and constants
│   ├── interfaces.ts           # TypeScript interfaces
│   └── constants.ts            # Trading pairs and mappings
├── docker-compose.yml          # Multi-service orchestration
└── README.md
```

## Application Overview

This application provides real-time monitoring of Ethereum cryptocurrency exchange rates across three major trading pairs:

- **ETH/USDC** - Ethereum to USD Coin
- **ETH/USDT** - Ethereum to Tether USD
- **ETH/BTC** - Ethereum to Bitcoin

### Key Features

- **Real-time Data**: Live price updates via Finnhub WebSocket API
- **Interactive Charts**: Responsive line charts using Nivo visualization library
- **Server-Sent Events**: Efficient real-time communication between frontend and backend
- **Auto-reconnection**: Automatic reconnection handling for dropped connections
- **Docker Support**: Containerized deployment with Docker Compose
- **TypeScript**: Full type safety across frontend and backend
- **Modern Stack**: React 19, NestJS, Vite, and modern development tools

### Architecture

- **Frontend**: React application with Vite build tool, featuring real-time charts and SSE connection management
- **Backend**: NestJS API server with WebSocket integration and Finnhub service abstraction
- **Data Flow**: Finnhub WebSocket → NestJS Service → SSE Stream → React Frontend → Chart Visualization
- **Shared Types**: Common TypeScript interfaces and constants shared between frontend and backend

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Finnhub API key (free tier available)

### Setup

1. **Create environment files**:

```bash
# Copy .env.example file in backend directory and rename to .env
cd backend
cp backend/.env.example backend/.env

# Provide FINNHUB_API_KEY value in .env file. Change any other values if necessary.
```

```bash
# Copy .env.example file in frontend directory and rename to .env
cd ../frontend
cp frontend/.env.example frontend/.env

# Change any values if necessary
```

2. **Install project dependencies**:

```bash
cd backend/
npm ci
cd ../frontend/
npm ci
```

3. **Start all services**:

   ```bash
   docker compose -p exchange-rate-app up -d --build
   ```

4. **Access the application**:

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

   ```bash
   # Backend health
   curl http://localhost:3000/exchange-rates/health
   ```

5. **View logs**

```bash
# View logs
docker compose logs -f

# View logs for specific service:
docker compose logs -f backend
docker compose logs -f frontend
```

6. **Stop all services**

```bash
docker compose -p exchange-rate-app down
```

## Build and Deploy Individual Services

```bash
# Backend only
cd backend
docker build -t exchange-rate-backend .
docker run -p 3000:3000 --env-file .env exchange-rate-backend

# Frontend only
cd frontend
docker build -t exchange-rate-frontend .
docker run -p 5173:5173 exchange-rate-frontend
```

### Development Mode

For development with hot reload and debugging:

**Backend Development**:

```bash
cd backend
npm ci
npm run start:dev
```

**Frontend Development**:

```bash
cd frontend
npm ci
npm run dev
```

## Backend API Endpoints

### Exchange Rates Controller

**Base URL**: `http://localhost:3000/exchange-rates`

#### `GET /exchange-rates/stream`

**Description**: Server-Sent Events (SSE) stream providing real-time exchange rate data

**Response Format**:

```json
{
  "data": {
    "rates": [
      {
        "symbol": "ETH/USDC",
        "price": 3245.67,
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "symbol": "ETH/USDT",
        "price": 3245.89,
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "symbol": "ETH/BTC",
        "price": 0.06789,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "source": "Finnhub",
    "status": "live",
    "type": "update"
  }
}
```

**Features**:

- Real-time price streaming via Finnhub WebSocket
- Automatic reconnection handling
- Heartbeat mechanism for connection health
- CORS enabled for frontend communication

#### `GET /exchange-rates/health`

**Description**: Health check endpoint for service monitoring

**Response Format**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Finnhub WebSocket",
  "hasPriceData": true,
  "priceDataCount": 3,
  "connectedSymbols": ["ETH/USDC", "ETH/USDT", "ETH/BTC"]
}
```

**Status Values**:

- `healthy`: WebSocket connected and receiving data
- `unhealthy`: WebSocket disconnected or no data
