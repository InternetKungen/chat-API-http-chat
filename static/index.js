let socket = io();

// LOGIN - username, password, channel, and login button
const usernameElem = document.querySelector('#username-input');
const passwordElem = document.querySelector('#password-input');
const channelDropdown = document.querySelector('.channel-dropdown');
const submitButton = document.querySelector('#login-submit');
const registerSectionButton = document.querySelector('#register-section-button');

// REGISTER - username, password, and register button
const registerUsernameElem = document.querySelector('#register-username-input');
const registerPasswordElem = document.querySelector('#register-password-input');
const registerButton = document.querySelector('#register_submit');
const registerSection = document.querySelector('.register');

// CHAT MESSAGE - input area for writing messages
const chatMessageInput = document.querySelector('#chat-message');
const sendButton = document.querySelector('#send');
/* ------------------------------------------- */
// New code
const privateMessageInput = document.querySelector('#private-message');
const privateMessageRecipient = document.querySelector('#private-recipient');
const sendPrivateButton = document.querySelector('#send-private');
/* ------------------------------------------- */
// LOGIN section and CHAT section, used for UI transitions
const login = document.querySelector('.login');
const chat = document.querySelector('.chat');

// CHAT AREA
let chatArea = document.querySelector('.chat-area');

// CONNECTED USERS
const connectedUsersElem = document.querySelector('.connected-users');

// FUNCTIONALITY
// Function to fetch channels from API and display them in the client
async function fetchAndDisplayChannels() {
  try {
    const response = await fetch('http://localhost:3000/channel');
    const channels = await response.json();

    const channelDropdown = document.querySelector('.channel-dropdown');

    channels.forEach((channel) => {
      if (channel.channelName !== 'broadcast') {
        const option = document.createElement('option');
        option.value = channel._id;
        option.textContent = channel.channelName;
        channelDropdown.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
  }
}

// Call the function to fetch and display channels when the page loads
document.addEventListener('DOMContentLoaded', fetchAndDisplayChannels);

// Display existing messages in the channel
async function displayMessages(channelId) {
  try {
    const response = await fetch(`http://localhost:3000/channel/${channelId}`, {
      headers: {
        Authorization: 'Bearer ' + socket.token,
      },
    });

    const messages = await response.json();
    console.log(messages);

    const chatArea = document.querySelector('.chat-area');
    chatArea.innerHTML = '';

    messages.forEach((message) => {
      const messageElement = document.createElement('p');
      messageElement.textContent = `[${message.createdAtTime}] ${message.createdBy}: ${message.message}`;
      chatArea.appendChild(messageElement);
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
}

// Show the register section
function showRegister() {
  console.log('showRegister function called');
  registerSection.classList.remove('hide');
  registerSection.classList.add('show');
  login.classList.add('hide');
  chat.classList.add('hide');
}

// Hide login and show chat section of the interface
function showChat() {
  login.classList.add('hide');
  chat.classList.add('show');
}

// Show login section
function showLogin() {
  login.classList.remove('hide');
  registerSection.remove('show');
  registerSection.add('hide');
}

// Function to add a typing message
function addTypingMessage(username) {
  const typingElem = document.querySelector('.typingMessage');
  typingElem.innerHTML = username + ' is typing';
}

// Function to remove a typing message
function removeTypingMessage() {
  const typingElem = document.querySelector('.typingMessage');
  setTimeout(() => {
    typingElem.innerHTML = ' ';
  }, 1000);
}

// Scroll to the bottom of the chat area
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Function to add a chat message
function addChatMessage(message) {
  let chatMessage = document.createElement('p');
  chatMessage.innerHTML = message;
  chatArea.append(chatMessage);
  scrollToBottom();
}

// Join a channel when logging in
async function joinChannel() {
  const username = usernameElem.value;
  const password = passwordElem.value;
  const channelId = channelDropdown.value;

  socket.emit('join', username, password, channelId);
  await tokenReceived;
  displayMessages(channelId);
}

// Send a message
function sendMessage() {
  const message = chatMessageInput.value; // message input from the user
  const channelId = channelDropdown.value; // selected channel ID

  socket.emit('new message', message, channelId); // Emit the 'new message' event to the server with the message and channel ID
  chatMessageInput.value = '';
}

/* ------------------------------------------- */
// Send a private message
function sendPrivateMessage() {
  const message = privateMessageInput.value;
  const recipient = privateMessageRecipient.value;

  socket.emit('privateMessage', { to: recipient, message });
  addChatMessage(`You (to ${recipient}): ${message}`);
  privateMessageRecipient.value = '';
  privateMessageInput.value = '';
}
/* ------------------------------------------- */

// EVENT LISTENERS for user interactions

// Login - join button
submitButton.addEventListener('click', async () => {
  joinChannel();
  showChat();
});

// Enter key works as join if focus is in username field
usernameElem.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    joinChannel();
    showChat();
  }
});

// Enter key works as join if focus is in password field
passwordElem.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    joinChannel();
    showChat();
  }
});

// Show register menu when Register button is clicked
registerSectionButton.addEventListener('click', () => {
  showRegister();
});

// Register a user
registerButton.addEventListener('click', () => {
  const username = registerUsernameElem.value;
  const password = registerPasswordElem.value;
  socket.emit('register', username, password);
  showLogin();
});

// Send message when Send button is clicked
sendButton.addEventListener('click', () => {
  sendMessage();
});

// Send message when Enter key is pressed in chat message input field
chatMessageInput.addEventListener('keydown', (event) => {
  const channelId = channelDropdown.value; // get channel id
  socket.emit('typing', channelId);
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
});

// Stop typing when user releases Enter key
chatMessageInput.addEventListener('keyup', () => {
  socket.emit('stop typing');
});

/* ------------------------------------------- */
// Send private message
sendPrivateButton.addEventListener('click', sendPrivateMessage);

// Enter key sends a private message if focus is in private message input field
privateMessageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendPrivateMessage();
  }
});

// SOCKET.IO EVENTS

// Display message
socket.on('send message', (message) => {
  addChatMessage(message);
});

// Update users
socket.on('update users', (users) => {
  connectedUsersElem.innerHTML = '';
  users.forEach((user) => {
    const userElem = document.createElement('p');
    userElem.textContent = user;
    connectedUsersElem.appendChild(userElem);
  });
});

// Private message
socket.on('privateMessage', (data) => {
  const { from, message } = data;
  addChatMessage(`${from} (private): ${message}`);
});
/* ------------------------------------------- */

// Handle events received from server via Socket.IO
/* ---------------------------------------------------------- */
// Skapa en promise som löser när token mottas
let tokenReceived = new Promise((resolve) => {
  socket.on('token', (token) => {
    // Spara token i klientens minne för framtida användning
    socket.token = token;
    resolve(); // Löser promise när token mottas
  });
});

/* ---------------------------------------------------------- */

// Update token when received from server
socket.on('token', (token) => {
  console.log(socket.token);
  socket.token = token;
});

// Handle user join event
socket.on('user joined', (username) => {
  const chatMessage = username + ' joined the chat';
  addChatMessage(chatMessage);
  const userParagraph = document.createElement('p');
  userParagraph.textContent = username;
  connectedUsersElem.appendChild(userParagraph);
});

// Handle user disconnect event
socket.on('user disconnected', (username) => {
  const chatMessage = username + ' disconnected from the chat';
  addChatMessage(chatMessage);
  connectedUsersElem.querySelectorAll('p').forEach((paragraph) => {
    if (paragraph.textContent === username) {
      paragraph.remove();
    }
  });
});

// Handle received messages
/* socket.on('send message', (message) => {
  addChatMessage(message);
}); */

// Handle typing event
socket.on('is typing', (username) => {
  addTypingMessage(username);
});

// Handle stop typing event
socket.on('not typing', () => {
  removeTypingMessage();
});

// Handle channel list event
socket.on('channel list', (channels) => {
  channels.forEach((channel, index) => {
    if (channel.channelName !== 'broadcast') {
      addChatMessage(`${index + 1}. ${channel.channelName} - ${channel.description}`);
    }
  });
});

// Handle delete channel error event
socket.on('delete channel error', (errorMessage) => {
  addChatMessage(errorMessage);
});

// Handle channel deleted event
socket.on('channel deleted', (indexNumber) => {
  addChatMessage(`Channel ${indexNumber} deleted successfully`);
});

// Handle display messages event
socket.on('display messages', (channelId) => {
  displayMessages(channelId);
});

// Handle update channel dropdown event
socket.on('update channel dropdown', (channelId) => {
  channelDropdown.value = channelId;
});

/* ---------------------------------------------------------- */

/* User Presence and Status */

// Function to update user presence status
function updateUserPresenceStatus(users) {
  connectedUsersElem.innerHTML = ''; // Clear the connected users list
  users.forEach((user) => {
    const userParagraph = document.createElement('p');
    userParagraph.textContent = user.username + (user.typing ? ' is typing' : '');
    connectedUsersElem.appendChild(userParagraph);
  });
}

// Socket.IO subscription for user presence status
/* socket.on('user presence status', (users) => {
  updateUserPresenceStatus(users);
}); */

// Function to emit typing event
function emitTypingEvent() {
  const channelId = channelDropdown.value;
  socket.emit('typing', channelId);
}

// Function to emit stop typing event
function emitStopTypingEvent() {
  socket.emit('stop typing');
}

// Event listeners for typing and stop typing events
chatMessageInput.addEventListener('input', emitTypingEvent);
chatMessageInput.addEventListener('blur', emitStopTypingEvent);
