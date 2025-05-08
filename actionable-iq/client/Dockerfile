# Stage 1: Build the React app (remains the same)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Minimal alpine with a simple HTTP server for health checks
FROM alpine:latest

# Optional: Install busybox-extras if httpd is not in the base image
# Some minimal alpine images might not have httpd by default.
# If the build fails finding /usr/sbin/httpd, uncomment the next line:
RUN apk add --no-cache busybox-extras

# Create a directory for the web server and a dummy index.html
RUN mkdir -p /var/www/localhost/htdocs && \
    echo "<html><body><h1>Cloud Run Health Check</h1></body></html>" > /var/www/localhost/htdocs/index.html

# Expose port 80 (documents that the container listens on this port)
EXPOSE 80

# Start the httpd server. It will listen on port 80 by default.
# -f: Run in foreground
# -v: Verbose logging to stdout/stderr (useful for Cloud Run logs)
# -p 80: Listen on port 80
# -h /var/www/localhost/htdocs: Serve files from this directory
# We use 'exec' so httpd becomes PID 1, properly handling signals.
CMD ["/bin/sh", "-c", "echo 'ALPINE MINIMAL TEST - Starting httpd at $(date)' > /dev/termination-log; echo 'ALPINE MINIMAL TEST - ENVIRONMENT VARS:' >> /dev/termination-log; env >> /dev/termination-log; exec /usr/sbin/httpd -f -v -p 80 -h /var/www/localhost/htdocs"]