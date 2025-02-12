const express = require("express");
const http = require("http");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const fetch = require("node-fetch");

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = "https://your-n8n-instance/webhook/twilio-audio"; // Replace with your actual n8n webhook URL

const app = express();
app.use(express.raw({ type: "audio/x-mulaw", limit: "5mb" })); // Handle Twilio's raw audio

// 📡 Receive Twilio audio via HTTP POST
app.post("/audio", async (req, res) => {
    console.log("🎙️ Received Twilio audio");

    const rawFilePath = "/tmp/twilio_audio.ulaw";
    const mp3FilePath = "/tmp/twilio_audio.mp3";

    try {
        // Save the raw μ-law audio
        fs.writeFileSync(rawFilePath, req.body);
        console.log("✅ Raw audio saved");

        // Convert μ-law (8000Hz) to optimized MP3 (32kbps)
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(rawFilePath)
                .audioCodec("libmp3lame")
                .audioBitrate("32k") // Optimize for low data usage
                .audioFrequency(8000) // Keep original Twilio sample rate
                .output(mp3FilePath)
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

        console.log("🎧 Converted audio to optimized MP3");

        // Send the MP3 file to n8n
        await sendToN8n(mp3FilePath);

        // Respond to Twilio (acknowledge receipt)
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error processing Twilio audio:", error);
        res.sendStatus(500);
    }
});

// 🚀 Send optimized MP3 to n8n
async function sendToN8n(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "audio/mpeg",
            },
            body: fileBuffer,
        });

        console.log(`✅ Sent MP3 to n8n, Response: ${response.status}`);
    } catch (error) {
        console.error("❌ Error sending MP3 to n8n:", error);
    }
}

// Start the server
http.createServer(app).listen(PORT, () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
});








