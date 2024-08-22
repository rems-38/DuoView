const socket = io();
let username = '';

$(document).ready(() => {
    username = prompt('Enter your username :');
    socket.emit('user-connected', username);

    function sendMessage() {
        const message = $('#chat-input').val();
        if (message.trim() !== '') {
            socket.emit('chat-message', {username, message});
            $('#chat-input').val('');
        }
    }

    $('#send-button').click(() => {
        sendMessage();
    });
    
    $('#chat-input').keydown((event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Empêche l'ajout d'une nouvelle ligne dans le champ texte
            sendMessage();
        }
    });

    socket.on('chat-message', (data) => {
        $('#chat-messages').append(`<div><strong>${data.username}</strong> : ${data.message} <small class="text-muted">${data.time}</small></div>`);
        $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
    });

    socket.on('system-message', (message) => {
        $('#chat-messages').append(`<div class="system-message">${message}</div>`);
        $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
    });
});