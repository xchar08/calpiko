# Dockerfile for y-websocket server
FROM node:16-alpine
WORKDIR /app
RUN npm install -g y-websocket-server
EXPOSE 8080
CMD ["y-websocket-server", "--port", "8080"]
