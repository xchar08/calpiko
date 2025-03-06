# Dockerfile for y-websocket server
FROM node:16-alpine
WORKDIR /app
RUN npm install y-websocket
EXPOSE 8080
CMD ["sh", "-c", "npx y-websocket --port 8080"]
