# Stage 1: Build the React app (remains the same)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Minimal test with alpine:latest and /dev/termination-log
FROM alpine:latest

# No WORKDIR or EXPOSE needed for this specific test,
# as we're not running a server or expecting probes.

# ENTRYPOINT that writes to /dev/termination-log and exits.
ENTRYPOINT ["/bin/sh", "-c", "echo 'ALPINE MINIMAL TEST - ENTRYPOINT INVOKED AT $(date)' > /dev/termination-log; echo 'ALPINE MINIMAL TEST - ENVIRONMENT VARS:' >> /dev/termination-log; env >> /dev/termination-log; echo 'ALPINE MINIMAL TEST - EXITING CLEANLY AT $(date)' >> /dev/termination-log; exit 0"]