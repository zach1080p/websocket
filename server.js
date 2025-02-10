const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        ws.send(`Echo: ${message}`);
    });

    ws.on("close", () => console.log("Client disconnected"));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`WebSocket Server running on port ${PORT}`));
