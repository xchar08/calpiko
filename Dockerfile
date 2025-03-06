# Dockerfile for your WebSocket server
FROM node:16-alpine
WORKDIR /app
# Install y-websocket as a dependency (not globally) so that npx can run it.
RUN npm install y-websocket
EXPOSE 8080
# Run using a shell to ensure npx executes correctly.
CMD ["sh", "-c", "npx y-websocket --port 8080"]
