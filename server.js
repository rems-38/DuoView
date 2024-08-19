const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
// const req = require('express/lib/request'); 
const { spawn } = require('child_process');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let videoPath = '';
let contentType = '';
let currentTime = 0;
let isPlaying = false;
let clientsConnected = 0;
let intervalId = null;

const mimeTypes = {
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
};

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (!videoPath) {
        return res.status(400).send('No video selected. Please select a video.');
    }
    next();
});

app.get('/video', (req, res) => {
    const ext = path.extname(videoPath).toLowerCase();

    if (ext === '.avi' || ext === '.mkv') {
        // Transcoding en temps réel vers MP4
        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-f', 'mp4',        // Format de sortie
            '-vcodec', 'libx264',  // Codec vidéo
            '-preset', 'fast',     // Préréglage pour la vitesse
            '-movflags', 'frag_keyframe+empty_moov',
            '-r', '25',            // Frame rate
            '-g', '52',            // Intervalle de groupes d'images
            '-sc_threshold', '0',
            '-c:a', 'aac',         // Codec audio
            '-b:a', '128k',
            '-bufsize', '8192k',   // Taille du buffer
            '-f', 'mp4',           // Format du conteneur
            'pipe:1'               // Sortie vers le pipe
        ]);

        res.setHeader('Content-Type', 'video/mp4');

        // Envoyer la sortie FFmpeg directement à la réponse HTTP
        ffmpeg.stdout.pipe(res);

        ffmpeg.stderr.on('data', (data) => {
            console.error(`FFmpeg stderr: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
        });

    } else {
        // Gérer les vidéos mp4 de manière classique
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
    }
});

wss.on('connection', ws => {
    clientsConnected++;
    console.log(`New client connected. Total clients: ${clientsConnected}`);

    // Initialiser le nouveau client avec l'état actuel de la vidéo
    ws.send(JSON.stringify({ event: 'sync', currentTime, isPlaying }));

    ws.on('close', () => {
        clientsConnected--;
        console.log(`Client disconnected. Total clients: ${clientsConnected}`);
        // controlPlayback('pause');
    });
});

// Contrôle de la lecture et de la pause depuis le serveur 
function controlPlayback(action) {
    if (action === 'play') {
        if (!videoPath) {
            console.log('No video selected. Cannot play.');
            return;
        }
        console.log('Play command sent by the server.');
        isPlaying = true;
        startTimer();
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'play' }));
            }
        });
    } else if (action === 'pause') {
        console.log('Pause command sent by the server.');
        isPlaying = false;
        stopTimer();
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'pause' }));
            }
        });
    } else if (action === 'sync') {
        console.log('Sync command received. Syncing all clients.');
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ event: 'sync', currentTime, isPlaying }));
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

function selectVideo() {
    process.stdout.write('Enter the path of the video file: ');
    process.stdin.once('data', (data) => {
        videoPath = data.toString().trim();
        
        if (!fs.existsSync(videoPath)) {
            console.log('File not found. Please enter a valid file path.');
            selectVideo();
        } else {
            console.log(`Video selected: ${videoPath}`);
        }
    })
}

// Ecoute des commandes en ligne de commande pour contrôler la vidéo
process.stdin.on('data', (data) => {
    const command = data.toString().trim();
    const availableCommands = ['play', 'pause', 'sync'];

    if (availableCommands.includes(command)) {
        controlPlayback(command);
    } else {
        console.log('Invalid command. Available commands: ' + availableCommands.join(', '));
    }
});



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    selectVideo();
});
