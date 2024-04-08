const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 4000;

app.use(express.static(__dirname)); // Lägg till denna rad för att servern ska kunna betjäna statiska filer
app.use(express.static(__dirname + '/static')); // Om dina statiska filer ligger i en mapp som heter "public"

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

//lägga till css fil
app.get('/style.css', (req, res) => { 
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(__dirname + '/style.css');
});

// Skapa en lista för att hålla reda på alla anslutna användare
let connectedUsers = [];

// Skicka den aktuella listan över anslutna användare till en specifik klient
function sendUserListToClient(socket) {
  socket.emit('update users', connectedUsers);
}

// Skicka den aktuella listan över anslutna användare till alla klienter
function sendUpdatedUserListToAll() {
  io.emit('update users', connectedUsers);
}

io.on('connection', (socket) => {

    // Skicka den aktuella listan över anslutna användare till den nyanslutna klienten
    sendUserListToClient(socket);

    //Användarnamn joined - till alla andra förutom användaren - genom boradcast
    socket.on("join", (username) => {
    
    console.log(username + " connected");
        socket.username = username;
        // Lägg till den nya användaren i listan över anslutna användare
        connectedUsers.push(username);
        socket.broadcast.emit('user joined', username);
        // Skicka den uppdaterade listan över anslutna användare till alla klienter
        sendUpdatedUserListToAll();
    });

    //säger till när en användare - generellt, inte vem - ansluter
    // io.emit('chat message', 'user connected');
    // console.log('a user connected');

    //användarnamn bredvid message - först sammansätts användarnamn och meddelande, sen skickas det ut.
    socket.on('chat message', (msg) => {
      const composedMessage = socket.username + ": " + msg;
        console.log('message: ' + msg);
        io.emit('chat message', composedMessage);
    });

     // När en klient skickar ett nytt meddelande
  socket.on("new message", (message) => {
    // Lägger ihop meddelandet med användarnamnet
    const composedMessage = socket.username + ": " + message;
    // Skickar meddelandet till anslutna klienter (inkl avsändaren)
    io.emit("send message", composedMessage);
  });

    //när användaren börjar skriva ett meddelande
    socket.on("typing", () => {
      socket.broadcast.emit('is typing', socket.username);
    });

    //när användaren slutar skriva
    socket.on("stop typing", () => {
      socket.broadcast.emit("not typing");
    });

    // när en användare kopplar från servern
    // socket.on('disconnect', () => {
    //     console.log('user disconnected');
    //     io.emit('chat message', 'user disconnected');
    // });

  //   socket.on('disconnect', (username) => {
  //     socket.username = username;
  //     console.log(username +' disconnected');
  //     socket.broadcast.emit('user disconnected', username);
  // });
  // när en användare kopplar från servern
socket.on('disconnect', () => {
//   if (socket.username) { // Kontrollera om användaren hade ett användarnamn
//     console.log(socket.username + ' disconnected');
//     socket.broadcast.emit('user disconnected', socket.username); // Skicka meddelande till alla anslutna klienter för att meddela att en användare kopplade från
// }
if (socket.username) { // Kontrollera om användaren hade ett användarnamn
  console.log(socket.username + ' disconnected');
  // Ta bort den frånkopplade användaren från listan över anslutna användare
  connectedUsers = connectedUsers.filter(user => user !== socket.username);
  // Meddela alla andra anslutna klienter om frånkopplingen genom broadcast
  socket.broadcast.emit('user disconnected', socket.username);
  // Skicka den uppdaterade listan över anslutna användare till alla andra anslutna klienter
  socket.broadcast.emit('update users', connectedUsers);
}
});



});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

