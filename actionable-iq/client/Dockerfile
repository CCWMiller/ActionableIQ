# Stage 1: Build the React app (remains the same)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Minimal HTTP server with Node.js for debugging
# We'll use node:18-alpine as the final stage directly for this test
# to ensure Node.js is available. The original entrypoint.sh and nginx.conf
# are not used in this specific debug Dockerfile.
FROM node:18-alpine

WORKDIR /app

# EXPOSE 80 is important for Cloud Run to know which port to send requests to
# and for the default TCP probe.
EXPOSE 80

# ENTRYPOINT with a simple Node.js HTTP server and extensive logging
ENTRYPOINT ["/bin/sh", "-c", " \
    echo 'NODE HTTP SERVER DEBUG - CONTAINER PROCESS STARTED' && \
    date && \
    echo 'NODE HTTP SERVER DEBUG - ENVIRONMENT VARIABLES:' && \
    env && \
    echo 'NODE HTTP SERVER DEBUG - ATTEMPTING TO START NODE.JS HTTP SERVER ON PORT 80' && \
    node -e \" \
        const http = require('http'); \
        const serverHostname = '0.0.0.0'; \
        const serverPort = 80; \
        \
        console.log('NODE HTTP SERVER DEBUG - Node.js script executing.'); \
        \
        const requestListener = function (req, res) { \
            console.log('NODE HTTP SERVER DEBUG - Received request:', req.method, req.url, 'Headers:', req.headers); \
            res.writeHead(200, { 'Content-Type': 'text/plain' }); \
            res.end('Hello from Cloud Run Debug Server!\\n'); \
        }; \
        \
        const server = http.createServer(requestListener); \
        \
        server.on('error', (e) => { \
            console.error('NODE HTTP SERVER DEBUG - Server error:', e); \
            process.exit(1); \
        }); \
        \
        server.listen(serverPort, serverHostname, () => { \
            console.log('NODE HTTP SERVER DEBUG - Node.js server started and listening on port ' + serverPort); \
        }); \
        \
        /* Keep Node running indefinitely (server.listen does this) */ \
        /* Add a periodic log to show it's still alive if needed */ \
        /* setInterval(() => { console.log('NODE HTTP SERVER DEBUG - Still alive...'); }, 60000); */ \
    \" \
"]