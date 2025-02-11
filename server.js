const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const N8N_WEBHOOK_URL = "https://n8n-x2bc.onrender.com/webhook/audio";
const PORT = 8080;

// Create HTTP server to handle upgrade requests
const server = http.createServer((req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' });
    res.end('Upgrade to WebSocket required');
});

const wss = new WebSocket.Server({ server });

// Buffer to store incoming audio chunks
let audioBuffer = [];
const MAX_BUFFER_SIZE = 2048; // Adjust based on performance

// Handle WebSocket Connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            audioBuffer.push(data);

            // Send when buffer reaches limit
            if (audioBuffer.length >= MAX_BUFFER_SIZE) {
                sendAudioToN8n();
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (audioBuffer.length > 0) sendAudioToN8n();
    });
});

// Function to send binary audio to n8n
async function sendAudioToN8n() {
    if (audioBuffer.length === 0) return;

    let audioChunk = Buffer.concat(audioBuffer);
    audioBuffer = []; // Clear buffer after sending

    try {
        await axios.post(N8N_WEBHOOK_URL, audioChunk, {
            headers: { 'Content-Type': 'application/octet-stream' }
        });

        console.log(`Sent ${audioChunk.length} bytes to n8n`);
    } catch (error) {
        console.error("Error sending audio to n8n:", error.message);
    }
}

// Start server
server.listen(PORT, () => {
    console.log(`WebSocket Server running on ws://localhost:${PORT}`);
});







