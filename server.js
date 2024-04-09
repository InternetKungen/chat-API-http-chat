//server.js
// import express from 'express';
// import http from 'http';
// import { Server } from 'socket.io';
// import fetch from 'node-fetch';

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);
// const port = process.env.PORT || 4000;

// app.use(express.static(__dirname));
// app.use(express.static(__dirname + '/static'));

// Server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 4000;

const staticPath = path.join(__dirname, 'static');

app.use(express.static(staticPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.get('/style.css', (req, res) => { 
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(staticPath, 'style.css'));
});

let connectedUsers = [];

function sendUserListToClient(socket) {
  socket.emit('update users', connectedUsers);
}

function sendUpdatedUserListToAll() {
  io.emit('update users', connectedUsers);
}

io.on('connection', (socket) => {

    sendUserListToClient(socket);

    socket.on("join", async (username, password, channelId) => {
    
        console.log(username + " connected");
        socket.username = username;
        connectedUsers.push(username);
        socket.broadcast.emit('user joined', username);
        sendUpdatedUserListToAll();

        // Authentisera användaren med API:et
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password // Lägg till riktigt lösenord här
            })
        });

        const data = await response.json();
        socket.token = data.token;

        // Skicka token till klienten
        socket.emit("token", socket.token);

        // Anslut användaren till rummet för den specifika kanalen
        socket.join(channelId);
    });

    // //broadcast - send message
    // socket.on('new message', async (msg) => {
    //     const composedMessage = socket.username + ": " + msg;
    //     console.log('message: ' + msg);
    //     // io.emit('new message', composedMessage);
    //     io.emit("send message", composedMessage);

    //     // Skicka meddelandet till API:et
    //     await fetch('http://localhost:3000/broadcast', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': 'Bearer ' + socket.token
    //         },
    //         body: JSON.stringify({
    //             message: msg
    //         })
    //     });
    // });

    //channel - send message
    socket.on("new message", async (message, channelId) => {
        const composedMessage = `${socket.username}: ${message}`;
        io.to(channelId).emit("send message", composedMessage);

        // Skicka meddelandet till API:et
        await fetch(`http://localhost:3000/channel/${channelId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + socket.token
            },
            body: JSON.stringify({
                message: message
            })
        });
    });

    socket.on("typing", (channelId) => {
    //   socket.broadcast.emit('is typing', socket.username);
    // Skicka "is typing"-meddelandet endast till användare i samma kanal
  socket.to(channelId).emit('is typing', socket.username);
    });

    socket.on("stop typing", () => {
      socket.broadcast.emit("not typing");
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            console.log(socket.username + ' disconnected');
            connectedUsers = connectedUsers.filter(user => user !== socket.username);
            socket.broadcast.emit('user disconnected', socket.username);
            socket.broadcast.emit('update users', connectedUsers);
        }
    });

});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
