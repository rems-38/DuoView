document.addEventListener('DOMContentLoaded', function() {
    const chatToggle = document.querySelector('.chat-toggle');
    const chatContainer = document.querySelector('.chat-container');

    chatToggle.addEventListener('click', function() {
        chatContainer.classList.toggle('hidden');
        chatToggle.classList.toggle('hidden');
    });
});
