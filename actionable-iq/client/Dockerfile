# Stage 1: Build the React app
# Use an official Node runtime as a parent image
FROM node:18-alpine as build
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# Install dependencies
RUN npm install

# Copy the rest of the client application code
COPY . .

# Set the API URL environment variable during build.
# This can be overridden by Cloud Run settings or skaffold profiles if needed.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the React application for production
RUN npm run build

# Stage 2: Serve static files with Nginx
# Use an official Nginx runtime as a parent image
FROM nginx:1.25-alpine

# Copy the production build output from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and prepare the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh # Ensure LF line endings
RUN chmod +x /entrypoint.sh

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx when the container launches
# CMD ["nginx", "-g", "daemon off;"]
ENTRYPOINT ["/entrypoint.sh"]
# CMD ["echo", "Minimal container started successfully! Sleeping..."; "sleep", "300"]