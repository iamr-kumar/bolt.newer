# Full Stack React + Node.js Project

This repository contains a full-stack application with a React frontend (built with Vite) and a Node.js backend.

## Project Structure

```
project-root/
├── be/            # Node.js backend
├── fe/            # React frontend (Vite)
└── README.md
```

## Backend (Node.js)

The backend is a Node.js application that serves API endpoints.

### Setup

1. Navigate to the backend directory:

```bash
cd be
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the `be` directory with the following variables:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=5001
CLAUDE_MODEL=claude-3-haiku-20240307
NODE_ENV=development
```

4. Start the development server:

```bash
npm run dev
```

The backend will be running at `http://localhost:5001`.

## Frontend (React + Vite)

The frontend is a React application built with Vite.

### Setup

1. Navigate to the frontend directory:

```bash
cd fe
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the `fe` directory with the following variables:

```
VITE_BACKEND_URL=http://localhost:5001/api
```

4. Start the development server:

```bash
npm run dev
```

The frontend will be running at `http://localhost:5173`.

## Development

During development, you'll need to run both the backend and frontend servers simultaneously.

### Backend Routes

The API routes are available at `http://localhost:5001/api/...`.

### Frontend Features

The React frontend communicates with the backend API and provides a user interface for the application.

## Building for Production

### Backend

```bash
cd be
npm run build
```

### Frontend

```bash
cd fe
npm run build
```

The built frontend will be in `fe/dist`.

## Deployment

To deploy this application:

1. Build both the frontend and backend
2. Set up the appropriate environment variables for your production environment
3. Serve the backend using a process manager like PM2
4. Serve the frontend static files using a web server like Nginx
