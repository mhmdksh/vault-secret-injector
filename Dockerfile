# Use the official Node.js image
FROM node:20-alpine

# Install inotify-tools for monitoring file changes
RUN apk add --no-cache inotify-tools

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Copy the monitoring script into the container
COPY inotify_monitor.sh /usr/local/bin/inotify_monitor.sh

# Ensure the script is executable
RUN chmod +x /usr/local/bin/inotify_monitor.sh

# Start the monitoring script in the background and then run the Node.js application
CMD ["/bin/sh", "-c", "/usr/local/bin/inotify_monitor.sh & node index.js"]