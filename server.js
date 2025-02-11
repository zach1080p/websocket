const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
require("dotenv").config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL; // Updated to handle transcription in n8n

// Twilio XML Response to Connect Media Stream
app.post("/twiml", (req, res) => {
    res.set("Content-Type", "text/xml");
    res.send(`
        <Response>
            <Connect>
                <Stream url="wss://websocket-h9yf.onrender.com" />
            </Connect>
        </Response>
    `);
});

// WebSocket Connection (Twilio Media Streams)
wss.on("connection", (ws) => {
    console.log("🔗 Twilio Media Stream Connected");

    ws.on("message", async (data) => {
        if (Buffer.isBuffer(data)) {  // Ensure message is binary (PCM audio)
            console.log("🎙️ Received PCM Audio from Twilio");

            try {
                // Send raw PCM audio directly to n8n for transcription + AI processing
                const n8nResponse = await axios.post(
                    N8N_WEBHOOK_URL,
                    data,
                    {
                        headers: { "Content-Type": "audio/wav" } // Ensure correct audio format
                    }
                );

                const generatedSpeech = n8nResponse.data.audio; // n8n returns synthesized audio from ElevenLabs

                // Send generated AI audio back to Twilio
                ws.send(generatedSpeech, { binary: true });
                console.log("📤 Sent AI-generated audio back to Twilio");

            } catch (error) {
                console.error("❌ Error sending audio to n8n:", error.response ? error.response.data : error.message);
            }
        }
    });

    ws.on("close", () => {
        console.log("❌ Client Disconnected");
    });
});

// Keep WebSocket server alive
setInterval(() => {
    http.get("https://websocket-h9yf.onrender.com");
    console.log("⏳ Keeping WebSocket server alive...");
}, 300000); // Every 5 minutes

// Start Server
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 WebSocket Server running on port ${PORT}`);
});





