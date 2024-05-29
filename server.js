import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

// Define filename and dirname using Node.js module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 4000;

// Define the path for static files
const staticPath = path.join(__dirname, 'static');

// Serve static files
app.use(express.static(staticPath));

// Route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Route to serve style.css
app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(staticPath, 'style.css'));
});

// Array to keep track of connected users
let connectedUsers = [];

// Function to send updated user list to a client
function sendUserListToClient(socket) {
  socket.emit('update users', connectedUsers);
}

// Function to broadcast updated user list to all clients
function sendUpdatedUserListToAll() {
  io.emit('update users', connectedUsers);
}

// Handle socket connections
io.on('connection', (socket) => {
  sendUserListToClient(socket); // Send list of connected users to the newly connected client

  // Register a new user
  socket.on('register', async (username, password) => {
    const response = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });
    console.log(await response.json());
  });

  // Join a channel
  socket.on('join', async (username, password, channelId) => {
    console.log(username + ' connected');
    socket.username = username;
    connectedUsers.push(username);
    socket.broadcast.emit('user joined', username);
    sendUpdatedUserListToAll();

    // Authentisera användaren med API:et
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password, // Lägg till riktigt lösenord här
      }),
    });

    const data = await response.json();
    socket.token = data.token;

    // Skicka token till klienten
    socket.emit('token', socket.token);

    // Anslut användaren till rummet för den specifika kanalen
    socket.join(channelId);
  });

  // Handle broadcasting messages
  socket.on('broadcast message', async (message) => {
    const composedMessage = `${socket.username}: ${message}`;
    console.log(composedMessage);

    io.emit('send message', composedMessage); // Skicka meddelandet till alla anslutna klienter
    // Skicka meddelandet till API:et
    await fetch('http://localhost:3000/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
      }),
    });
  });

  // Handle sending new messages
  socket.on('new message', async (message, channelId) => {
    const timestamp = new Date().toLocaleTimeString();
    const composedMessage = `[${timestamp}] ${socket.username}: ${message}`; // message with timestamp and username
    io.to(channelId).emit('send message', composedMessage); // broadcast the formatted message to all clients in the specified channel

    // Send the message to the API
    await fetch(`http://localhost:3000/channel/${channelId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + socket.token,
      },
      body: JSON.stringify({
        message: message, // Include the original message text in the request body
      }),
    });
  });

  // Handle creating a new channel
  socket.on('create channel', async (channelName, channelDescription, channelId) => {
    // Här kan du implementera logiken för att skapa den nya kanalen med namn och beskrivning
    console.log(`Skapar ny kanal med namn: ${channelName} och beskrivning: ${channelDescription}`);

    // Skicka meddelandet till API:et
    try {
      const response = await fetch(`http://localhost:3000/channel/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + socket.token,
        },
        body: JSON.stringify({
          channelName: channelName,
          description: channelDescription,
          messages: [],
        }),
      });

      // Kontrollera om skapandet av kanalen lyckades
      if (response.ok) {
        // Om kanalen skapades framgångsrikt
        console.log(
          `Kanal med namn ${channelName} och beskrivning ${channelDescription} skapades framgångsrikt.`
        );

        const composedResponse = `Kanal med namn ${channelName} och beskrivning ${channelDescription} skapades framgångsrikt.`;
        io.to(channelId).emit('send message', composedResponse);
      } else {
        console.error('Fel vid skapande av kanal:', response.statusText);
        // Om det uppstår ett fel kan du hantera det här, t.ex. visa ett felmeddelande för användaren
        const composedResponse = `'Fel vid skapande av kanal:', response.statusText`;
        io.to(channelId).emit('send message', composedResponse);
      }
    } catch (error) {
      console.error('Något gick fel:', error);
      // Om det uppstår ett fel kan du hantera det här, t.ex. visa ett felmeddelande för användaren
    }
  });

  // Handle listing channels
  socket.on('list channels', async () => {
    try {
      const response = await fetch('http://localhost:3000/channel');
      const channels = await response.json(); // Ersätt med riktig logik för att hämta kanaler
      // Skicka listan över kanaler till klienten
      socket.emit('channel list', channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      // Hantera eventuella fel här
    }
  });

  socket.on('delete channel', async (indexNumber) => {
    try {
      const response = await fetch('http://localhost:3000/channel');
      const channels = await response.json();

      let channelsListed = []; // Skapa en tom lista för att lagra index och kanal-ID
      for (let i = 0; i < channels.length; i++) {
        channelsListed.push([i, channels[i].channelId]);
      }

      // Ta bort kanalen baserat på indexet
      const removedChannel = channelsListed.splice(indexNumber, 1)[0];
      const channelId = removedChannel[1];

      // Skicka meddelande till kanalen att den har tagits bort
      io.to(channelId).emit(
        'send message',
        `Kanal ${channels[channelId].channelName} har tagits bort.`
      );

      // Skicka meddelandet till API:et
      const deleteResponse = await fetch(`http://localhost:3000/channel/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + socket.token,
        },
      });

      // Kontrollera om borttagningen av kanalen lyckades
      if (deleteResponse.ok) {
        console.log(`Kanal ${channels[channelId].channelName} har tagits bort.`);
      } else {
        console.error('Fel vid borttagning av kanal:', deleteResponse.statusText);
        // Hantera fel här
      }
    } catch (error) {
      console.error('Något gick fel:', error);
      // Hantera fel här
    }
  });
  /* ---------------------------------------------------------- */
  // Handle user presence and status
  /*   socket.on('user presence', (username) => {
    socket.broadcast.emit('user presence', username);
  }); */

  socket.on('typing', (channelId) => {
    socket.to(channelId).emit('is typing', socket.username);
  });

  socket.on('stop typing', (username) => {
    socket.broadcast.emit('not typing', username);
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(socket.username + ' disconnected');
      connectedUsers = connectedUsers.filter((user) => user !== socket.username);
      socket.broadcast.emit('user disconnected', socket.username);
      socket.broadcast.emit('update users', connectedUsers);
    }
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
