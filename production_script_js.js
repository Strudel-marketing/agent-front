// Global state
let isLoading = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Configuration
const WEBHOOK_URL = 'https://n8n.davidvmayer.com/webhook/mega-agent';

// DOM elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const messagesContainer = document.getElementById('messages-container');
const welcomeMessage = document.getElementById('welcome-message');
const typingIndicator = document.getElementById('typing-indicator');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mega Agent initialized');
    
    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    micButton.addEventListener('click', handleMicrophoneToggle);
    messageInput.addEventListener('keydown', handleKeyDown);
    
    // Focus on input
    messageInput.focus();
});

// Handle send message
async function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text || isLoading) return;
    
    await sendMessage(text);
}

// Handle keyboard events
function handleKeyDown(event) {
    if (event.key === 'Enter' && !isLoading) {
        event.preventDefault();
        handleSendMessage();
    } else if (event.key === 'Escape') {
        messageInput.value = '';
        messageInput.focus();
    }
}

// Handle microphone toggle
async function handleMicrophoneToggle() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

// Send message to webhook
async function sendMessage(text) {
    try {
        // Hide welcome message
        welcomeMessage.style.display = 'none';
        
        // Add user message
        addMessage('user', text);
        
        // Clear input and set loading state
        messageInput.value = '';
        setLoadingState(true);
        showTypingIndicator();
        
        console.log('Sending message to webhook:', text);
        
        // Send to webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: text }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log('Received response:', responseText);
        
        // Hide typing indicator and show response
        hideTypingIndicator();
        await typeMessage('agent', responseText);
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessage('agent', `שגיאה בתקשורת עם הסוכן: ${error.message}. נסה שוב.`);
    } finally {
        setLoadingState(false);
        messageInput.focus();
    }
}

// Start recording
async function startRecording() {
    try {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            } 
        });
        
        console.log('Microphone access granted');
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            console.log('Audio data available:', event.data.size);
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            console.log('Recording stopped');
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log('Audio blob created:', audioBlob.size, 'bytes');
            
            // Here you would typically send the audio to a speech-to-text service
            // For now, we'll just indicate that audio was recorded
            messageInput.value = '🎤 הודעה קולית נקלטה - עבד את הטקסט והקלד כאן';
            messageInput.focus();
            messageInput.select();
            
            // Stop all tracks
            stream.getTracks().forEach(track => {
                track.stop();
                console.log('Track stopped:', track.kind);
            });
        };
        
        mediaRecorder.onerror = (error) => {
            console.error('MediaRecorder error:', error);
            setRecordingState(false);
        };
        
        mediaRecorder.start(1000);
        setRecordingState(true);
        console.log('Recording started');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert(`שגיאה בגישה למיקרופון: ${error.message}`);
    }
}

// Stop recording
function stopRecording() {
    console.log('Stopping recording...');
    if (mediaRecorder && isRecording) {
        if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setRecordingState(false);
    }
}

// Add message to chat
function addMessage(type, content) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const userType = type === 'user' ? '[USER]' : '[AGENT]';
    
    messageElement.innerHTML = `
        <div class="timestamp">${userType} ${timestamp}</div>
        <div class="message-box ${type}-message">${escapeHtml(content)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Type message with animation
async function typeMessage(type, content) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const userType = type === 'user' ? '[USER]' : '[AGENT]';
    
    messageElement.innerHTML = `
        <div class="timestamp">${userType} ${timestamp}</div>
        <div class="message-box ${type}-message"></div>
    `;
    
    messagesContainer.appendChild(messageElement);
    const contentElement = messageElement.querySelector('.message-box');
    
    // Type character by character
    for (let i = 0; i <= content.length; i++) {
        contentElement.textContent = content.slice(0, i);
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, 30));
    }
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    scrollToBottom();
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}

// Set loading state
function setLoadingState(loading) {
    isLoading = loading;
    messageInput.disabled = loading;
    sendButton.disabled = loading || !messageInput.value.trim();
    micButton.disabled = loading;
}

// Set recording state
function setRecordingState(recording) {
    isRecording = recording;
    if (recording) {
        micButton.classList.add('recording');
        micButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 9h6v6H9z"></path>
            </svg>
        `;
    } else {
        micButton.classList.remove('recording');
        micButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        `;
    }
}

// Scroll to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update send button state on input change
messageInput.addEventListener('input', function() {
    sendButton.disabled = isLoading || !messageInput.value.trim();
});