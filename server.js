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

    socket.on("register", async (username, password) => {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password 
            })
        });
        console.log(await response.json());
    })

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

    socket.on("broadcast message", async (message) => {
        const composedMessage = `${socket.username}: ${message}`;
        console.log(composedMessage);

        io.emit("send message", composedMessage); // Skicka meddelandet till alla anslutna klienter
        // Skicka meddelandet till API:et
        await fetch('http://localhost:3000/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message
            })
        });
      });

    //channel - send message
    socket.on("new message", async (message, channelId) => {
        const timestamp = new Date().toLocaleTimeString();
        const composedMessage = `[${timestamp}] ${socket.username}: ${message}`;
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

    //create channel
    socket.on("create channel", async (channelName, channelDescription, channelId) => {
        // Här kan du implementera logiken för att skapa den nya kanalen med namn och beskrivning
        console.log(`Skapar ny kanal med namn: ${channelName} och beskrivning: ${channelDescription}`);

          // Skicka meddelandet till API:et
          try {
            const response = await fetch(`http://localhost:3000/channel/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + socket.token
                },
                body: JSON.stringify({
                    channelName: channelName,
                    description: channelDescription,
                    messages: []
                })
            });
            
            // Kontrollera om skapandet av kanalen lyckades
            if (response.ok) {
                // Om kanalen skapades framgångsrikt
                console.log(`Kanal med namn ${channelName} och beskrivning ${channelDescription} skapades framgångsrikt.`);
            
                const composedResponse = `Kanal med namn ${channelName} och beskrivning ${channelDescription} skapades framgångsrikt.`
                io.to(channelId).emit("send message", composedResponse);
            } else {
                console.error('Fel vid skapande av kanal:', response.statusText);
                // Om det uppstår ett fel kan du hantera det här, t.ex. visa ett felmeddelande för användaren
                const composedResponse = `'Fel vid skapande av kanal:', response.statusText`
                io.to(channelId).emit("send message", composedResponse);
            }
        } catch (error) {
            console.error('Något gick fel:', error);
            // Om det uppstår ett fel kan du hantera det här, t.ex. visa ett felmeddelande för användaren
        }
      });

      // Lyssna efter begäran om att listas kanaler
    socket.on("list channels", async () => {
        try {
            const response = await fetch('http://localhost:3000/channel');
            const channels = await response.json(); // Ersätt med riktig logik för att hämta kanaler
            // Skicka listan över kanaler till klienten
            socket.emit("channel list", channels);
        } catch (error) {
            console.error("Error fetching channels:", error);
            // Hantera eventuella fel här
        }
    });

    socket.on("delete channel", async (indexNumber) => {
        try {
            const response = await fetch('http://localhost:3000/channel');
            const channels = await response.json(); 
          
            let channelsListed = []; // Skapa en tom lista för att lagra index och kanal-ID
    
            // Loopa igenom kanalerna och skapa index samt spara kanal-ID i en lista
            channels.forEach((channel, index) => {
                if (channel.channelName !== "broadcast") {
                    channelsListed.push({ index: index + 1, channelId: channel._id });
                }
            });
    
            // Hitta kanalens ID med hjälp av det angivna indexnumret
            const channelToDelete = channelsListed.find(channel => channel.index === indexNumber);
    
            if (!channelToDelete) {
                throw new Error("Channel not found");
            }
    
            // Ta bort kanalen från databasen med det identifierade ID:et
            const deleteResponse = await fetch(`http://localhost:3000/channel/${channelToDelete.channelId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + socket.token
                }
            });
    
            if (!deleteResponse.ok) {
                throw new Error("Failed to delete channel");
            }
    
            // Skicka en bekräftelse till klienten att kanalen har tagits bort
            socket.emit("channel deleted", channelToDelete.index);
    
        } catch (error) {
            console.error("Error deleting channel:", error);
            // Skicka felmeddelande till klienten om något går fel
            socket.emit("delete channel error", error.message);
        }
    });

    socket.on("join channel", async (indexNumber) => {
        try {
            const response = await fetch('http://localhost:3000/channel');
            const channels = await response.json(); 
          
            let channelsListed = []; // Skapa en tom lista för att lagra index och kanal-ID
    
            // Loopa igenom kanalerna och skapa index samt spara kanal-ID i en lista
            channels.forEach((channel, index) => {
                if (channel.channelName !== "broadcast") {
                    channelsListed.push({ index: index + 1, channelId: channel._id });
                }
            });
    
            // Hitta kanalens ID med hjälp av det angivna indexnumret
            const channelToJoin = channelsListed.find(channel => channel.index === indexNumber);
    
            if (!channelToJoin) {
                throw new Error("Channel not found");
            }

            socket.join(channelToJoin.channelId);
    
                    // Skicka meddelandet till klienten för att uppdatera kanalen
            socket.emit("display messages", channelToJoin.channelId);
            // Uppdatera värdet för aktuell kanal i dropdown-menyn
            socket.emit("update channel dropdown", channelToJoin.channelId);
        } catch (error) {
            console.error("Error joining channel:", error);
            // Skicka felmeddelande till klienten om något går fel
            socket.emit("join channel error", error.message);
        }
    });

    socket.on("typing", (channelId) => {
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
