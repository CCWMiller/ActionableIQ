# Stage 1: Build the React app
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL=/api # Ensure this is correctly used by your build process
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Serve the React app with httpd on alpine
FROM alpine:latest

# Install httpd
RUN apk add --no-cache busybox-extras

# Create the directory for httpd to serve files from
# and copy the built React app from the 'build' stage
WORKDIR /var/www/localhost/htdocs
COPY --from=build /app/build .

# Expose port 80
EXPOSE 80

# Start httpd
# -f: Run in foreground
# -v: Verbose logging (optional for production, but good for now)
# -p 80: Listen on port 80
# -h /var/www/localhost/htdocs: Serve files from this directory
CMD ["/usr/sbin/httpd", "-f", "-v", "-p", "80", "-h", "/var/www/localhost/htdocs"]