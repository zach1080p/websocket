const WebSocket = require("ws");
const http = require("http");

// Use environment PORT (Render will assign one)
const PORT = process.env.PORT || 8080;

// Create an HTTP server (required for WebSocket)
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("🔗 New client connected");

    ws.on("message", (message) => {
        console.log(`📩 Received: ${message}`);
        ws.send(`Echo: ${message}`);
    });

    ws.on("close", () => {
        console.log("❌ Client disconnected");
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`🚀 WebSocket Server running on port ${PORT}`);
});

// Keep the server alive (prevents Render from idling)
setInterval(() => {
    console.log("⏳ Keeping server alive...");
    http.get(`http://localhost:${PORT}`);
}, 300000); // Ping every 5 minutes

