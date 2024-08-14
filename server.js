const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let currentTime = 0;
let isPlaying = false;
let clientsConnected = 0; // Compte le nombre de clients connectés
let intervalId = null;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/video', (req, res) => {
    const videoPath = path.join(__dirname, 'videos', 'video.mp4');
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

wss.on('connection', ws => {
    clientsConnected++;
    console.log(`New client connected. Total clients: ${clientsConnected}`);

    // Synchroniser le nouveau client avec l'état actuel de la vidéo
    ws.send(JSON.stringify({ event: 'sync', currentTime, isPlaying }));

    // Si deux clients sont connectés, ils sont synchronisés à l'état actuel
    if (clientsConnected === 2 && isPlaying) {
        ws.send(JSON.stringify({ event: 'play' }));
    }

    ws.on('close', () => {
        clientsConnected--;
        console.log(`Client disconnected. Pausing video. Total clients: ${clientsConnected}`);
        controlPlayback('pause');
    });

    // Les clients ne peuvent plus envoyer de commandes play/pause
    ws.on('message', message => {
        const data = JSON.parse(message);

        if (data.event === 'seek') {
            currentTime = data.currentTime;
            console.log(`Seek event received. Updating current time to ${currentTime}. Broadcasting to all clients.`);
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ event: 'seek', currentTime }));
                }
            });
        }
    });
});

// Contrôle de la lecture et de la pause depuis le serveur 
function controlPlayback(action) {
    if (action === 'play') {
        isPlaying = true;
        console.log('Play command sent by the server.');
        startTimer();
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'play' }));
            }
        });
    } else if (action === 'pause') {
        isPlaying = false;
        console.log('Pause command sent by the server.');
        stopTimer();
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'pause' }));
            }
        });
    }
}

// Démarre l'incrémentation de currentTime
function startTimer() {
    if (intervalId === null) {
        intervalId = setInterval(() => {
            currentTime += 1; // Incrémente le temps de 1 seconde
        }, 1000); // Mise à jour toutes les secondes
    }
}

// Arrête l'incrémentation de currentTime
function stopTimer() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

// Synchronisation manuelle de tous les clients
function syncClients() {
    console.log('Sync command received. Syncing all clients.');
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event: 'sync', currentTime, isPlaying }));
        }
    });
}

// Ecoute des commandes en ligne de commande pour contrôler la vidéo
process.stdin.on('data', (data) => {
    const command = data.toString().trim();

    if (command === 'play') {
        if (clientsConnected === 2) {
            controlPlayback('play');
        } else {
            console.log('Cannot play. Waiting for two clients to be connected.');
        }
    } else if (command === 'pause') {
        controlPlayback('pause');
    } else if (command === 'sync') {
        syncClients();
    } else {
        console.log('Unknown command. Use "play" or "pause".');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
