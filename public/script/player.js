const video = document.getElementById('video');
const loading = document.getElementById('loading');              
const ws = new WebSocket(`ws://${window.location.host}`);

ws.onopen = () => {
    console.log('Connected to WebSocket server');
    checkBuffering();
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.event === 'sync') {
        console.log('Received sync event:', data);

        const offset = document.getElementsByName('time')[0].value;
        if (offset) {
            video.currentTime = data.currentTime - offset;
        } else { video.currentTime = data.currentTime; }
    }

    if (data.event === 'play') {
        console.log('Received play event');
        video.play();
    }

    if (data.event === 'pause') {
        console.log('Received pause event');
        video.pause();
    }

    if (data.event === 'time') {
        console.log('Received time event:', data);

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'time';
        input.value = data.currentTime;
        document.body.appendChild(input);
    }
};

video.addEventListener('play', () => {
    event.preventDefault();
    console.log('Sending play event')
    ws.send(JSON.stringify({ event: 'play' }));
});

video.addEventListener('pause', () => {
    event.preventDefault();
    console.log('Sending pause event')
    ws.send(JSON.stringify({ event: 'pause' }));
});

function checkBuffering() {
    const buffered = video.buffered;
    if (buffered.length > 0) {
        const bufferEnd = buffered.end(0);
        const bufferStart = buffered.start(0);
        const bufferDuration = bufferEnd - bufferStart;
        console.log(`Buffer duration is ${bufferDuration} seconds`);

        if (bufferDuration > 10) {
            isReady = true;
            loading.style.display = 'none';
            video.style.display = 'block';
        } else {
            loading.style.display = 'block';
            video.style.display = 'none';
            setTimeout(checkBuffering, 1000);
        }
    } else {
        loading.style.display = 'block';
        video.style.display = 'none';
        setTimeout(checkBuffering, 1000);
    }
}