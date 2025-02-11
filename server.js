const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
require("dotenv").config(); // Load environment variables

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

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
        if (Buffer.isBuffer(data)) {  // Check if message is binary
            console.log("🎙️ Received PCM Audio from Twilio");
            console.log("🔍 First bytes of audio:", data.slice(0, 10)); // Debugging first bytes

            try {
                // Send Twilio PCM audio to Deepgram for real-time transcription
                const transcriptionResponse = await axios.post(
                    "https://api.deepgram.com/v1/listen",
                    data,
                    {
                        headers: {
                            Authorization: `Token ${DEEPGRAM_API_KEY}`,
                            "Content-Type": "audio/wav",
                        },
                        params: {
                            model: "phonecall",
                            language: "en-US",
                            punctuate: true,
                            interim_results: false,
                            encoding: "linear16",  // Ensuring the correct encoding
                            sample_rate: 8000      // Matching Twilio's PCM format
                        },
                    }
                );

                const transcribedText = transcriptionResponse.data.results.channels[0].alternatives[0].transcript;
                console.log("📝 Transcribed Text:", transcribedText);

                // Send transcribed text to n8n for AI processing
                const n8nResponse = await axios.post(N8N_WEBHOOK_URL, { text: transcribedText });
                const generatedSpeech = n8nResponse.data.audio; // n8n returns synthesized audio from ElevenLabs

                // Send generated audio back to Twilio
                ws.send(generatedSpeech, { binary: true });
                console.log("📤 Sent AI-generated audio back to Twilio");

            } catch (error) {
                console.error("❌ Deepgram API Error:", error.response ? error.response.data : error.message);
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






