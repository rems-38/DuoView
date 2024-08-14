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

    // Si deux clients sont connectés, ils sont synchronisés à l'état actuel
    if (clientsConnected === 2) {
        ws.send(JSON.stringify({ event: 'sync', currentTime, isPlaying }));

        if (isPlaying) {
            ws.send(JSON.stringify({ event: 'play' }));
        }
    } else {
        ws.send(JSON.stringify({ event: 'wait', message: 'Waiting for another user to connect...' }));
    }

    ws.on('close', () => {
        clientsConnected--;
        console.log(`Client disconnected. Total clients: ${clientsConnected}`);
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

// Fonction pour contrôler la lecture et la pause depuis le serveur uniquement
function controlPlayback(action) {
    if (action === 'play') {
        isPlaying = true;
        console.log('Play command sent by the server.');
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'play' }));
            }
        });
    } else if (action === 'pause') {
        isPlaying = false;
        console.log('Pause command sent by the server.');
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'pause' }));
            }
        });
    }
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
    } else {
        console.log('Unknown command. Use "play" or "pause".');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
