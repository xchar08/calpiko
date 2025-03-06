# Use an official lightweight Node.js image.
FROM node:16-alpine

# Set working directory.
WORKDIR /app

# Install y-websocket locally (it will be used via npx).
RUN npm install y-websocket

# Expose port 8080.
EXPOSE 8080

# Start the WebSocket server using npx.
CMD ["npx", "y-websocket", "--port", "8080"]
