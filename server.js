const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const fetch = require("node-fetch");

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = "https://your-n8n-instance/webhook"; // Replace with your n8n webhook URL

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let activeCalls = new Set();

wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
        try {
            const event = JSON.parse(message);

            if (event.callActive) {
                if (!activeCalls.has(event.callId)) {
                    activeCalls.add(event.callId);
                    console.log(`📞 Call started: ${event.callId}`);
                    sendToN8n(event);
                }
            } else if (activeCalls.has(event.callId)) {
                activeCalls.delete(event.callId);
                console.log(`📴 Call ended: ${event.callId}`);
            } else {
                console.log("Ignoring message, no active call.");
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    });

    ws.on("close", () => console.log("WebSocket client disconnected"));
});

// Send data to n8n only when a call is active
function sendToN8n(event) {
    fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
    })
    .then((res) => console.log(`✅ Sent to n8n, response: ${res.status}`))
    .catch((err) => console.error("❌ Error sending to n8n:", err));
}

// Start the server
server.listen(PORT, () => console.log(`🚀 WebSocket server running on port ${PORT}`));








