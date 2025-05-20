# Stage 1: Build the React app
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL=/api
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=${REACT_APP_GOOGLE_CLIENT_ID}
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

# Modified CMD to list files for debugging, then start httpd
CMD ["/bin/sh", "-c", "echo '---- Contents of /var/www/localhost/htdocs ----'; ls -lR /var/www/localhost/htdocs; echo '---- Starting httpd ----'; /usr/sbin/httpd -f -v -p 80 -h /var/www/localhost/htdocs"]