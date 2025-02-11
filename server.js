const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');
const { PassThrough } = require('stream');

const wss = new WebSocket.Server({ port: 8080 });

// Configuration: Reduce Sample Rate & Bit Depth
const AUDIO_CONFIG = {
    sampleRate: 16000, // Reduce from 44100Hz to 16kHz
    bitDepth: 8, // Reduce bit depth from 16-bit to 8-bit
    numChannels: 1, // Convert Stereo to Mono
    batchSize: 512, // Reduce audio chunk size
    throttleTime: 300, // Time between sending audio chunks (milliseconds)
};

// Webhook URL for n8n
const N8N_WEBHOOK_URL = "https://n8n-x2bc.onrender.com/webhook/audio";

// Buffer to collect audio chunks
let audioBuffer = [];
let isProcessing = false;

// Function to downsample and process audio before sending to n8n
function processAudioData(audioChunk) {
    // Convert PCM audio to 8-bit mono, lower sample rate
    let downsampledAudio = downsampleAudio(audioChunk);
    audioBuffer.push(downsampledAudio);

    // If not already processing, start sending data in batches
    if (!isProcessing) {
        isProcessing = true;
        sendBatchedAudio();
    }
}

// Function to send batched audio to n8n at controlled intervals
async function sendBatchedAudio() {
    while (audioBuffer.length > 0) {
        let batch = audioBuffer.splice(0, AUDIO_CONFIG.batchSize);

        try {
            await axios.post(N8N_WEBHOOK_URL, {
                audioData: batch.toString('base64'), // Convert to base64 for efficient transport
                format: "pcm",
                sampleRate: AUDIO_CONFIG.sampleRate,
                bitDepth: AUDIO_CONFIG.bitDepth,
                numChannels: AUDIO_CONFIG.numChannels
            });

            console.log(`Sent ${batch.length} bytes of audio to n8n`);
        } catch (error) {
            console.error("Error sending audio to n8n:", error.message);
        }

        // Throttle to prevent overloading n8n
        await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.throttleTime));
    }

    isProcessing = false;
}

// Function to downsample audio (reduces RAM usage)
function downsampleAudio(audioBuffer) {
    let downsampledBuffer = Buffer.alloc(audioBuffer.length / 2);

    for (let i = 0; i < downsampledBuffer.length; i++) {
        downsampledBuffer[i] = audioBuffer[i * 2] >> 1; // Reduce bit depth
    }

    return downsampledBuffer;
}

// WebSocket connection event
wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', data => {
        processAudioData(Buffer.from(data));
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log("WebSocket server running on ws://localhost:8080");






