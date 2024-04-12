let socket = io();

//LOGIN - användarnamn, password, channel och login-knapp
const usernameElem = document.querySelector("#username-input");
const passwordElem = document.querySelector("#password-input");
const channelDropdown = document.querySelector(".channel-dropdown");
const submitButton = document.querySelector("#login-submit");
const registerSectionButton = document.querySelector("#register-section-button");

//REGISTER - användarnamn, password, channel och register-knapp
const registerUsernameElem = document.querySelector("#register-username-input");
const registerPasswordElem = document.querySelector("#register-password-input");
const registerButton = document.querySelector("#register_submit"); // Fix the selector here
const registerSection = document.querySelector(".register");

//CHAT-MESSAGE - där man skriver in sitt meddelande
const chatMessageInput = document.querySelector("#chat-message");
const sendButton = document.querySelector("#send");

//LOGIN-section och CHAT-section, används vid showChat
const login = document.querySelector(".login");
const chat = document.querySelector(".chat");

//CHAT-AREA
let chatArea = document.querySelector(".chat-area");

//CONNECTED USERS
const connectedUsersElem = document.querySelector(".connected-users");

//FUNKTIONER
// Funktion för att hämta kanaler från API och visa dem i klienten
async function fetchAndDisplayChannels() {
    try {
        const response = await fetch("http://localhost:3000/channel");
        const channels = await response.json();

        const channelDropdown = document.querySelector(".channel-dropdown");

        channels.forEach((channel) => {
            if (channel.channelName !== "broadcast") {
                const option = document.createElement("option");
                option.value = channel._id;
                option.textContent = channel.channelName;
                channelDropdown.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Error fetching channels:", error);
    }
}

// Anropa funktionen för att hämta och visa kanaler när sidan laddas
document.addEventListener("DOMContentLoaded", fetchAndDisplayChannels);

//Visa befintliga meddelanden i kanalen
async function displayMessages(channelId) {
    try {
        const response = await fetch(`http://localhost:3000/channel/${channelId}`, {
            headers: {
                Authorization: "Bearer " + socket.token,
            },
        });

        const messages = await response.json();
        console.log(messages);

        const chatArea = document.querySelector(".chat-area");
        chatArea.innerHTML = "";

        messages.forEach((message) => {
            const messageElement = document.createElement("p");
            messageElement.textContent = `[${message.createdAtTime}] ${message.createdBy}: ${message.message}`;
            chatArea.appendChild(messageElement);
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}

function showRegister() {
    console.log("showRegister function called");
    registerSection.classList.remove("hide"); // Remove the hide class
    registerSection.classList.add("show");
    login.classList.add("hide");
    chat.classList.add("hide");
}

//Dölj inloggning och visar chatt-delen av gränsnittet
function showChat() {
    login.classList.add("hide");
    chat.classList.add("show");
}

function showLogin() {
  login.classList.remove("hide");
  registerSection.remove("show");
  registerSection.add("hide");
}

//När någon skriver - visa "user is typing.."
function addTypingMessage(username) {
    // Lägger till meddelande om att användaren skriver
    const typingElem = document.querySelector(".typingMessage");
    typingElem.innerHTML = username + " is typing";
}

//När någon slutar skriva - ta bort "user is typing.."
function removeTypingMessage() {
    // Tar bort meddelandet om att användaren skriver efter 1 sek
    const typingElem = document.querySelector(".typingMessage");
    setTimeout(() => {
        typingElem.innerHTML = " ";
    }, 1000);
}

function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function addChatMessage(message) {
    // Lägger till ett nytt chattmeddelande
    let chatMessage = document.createElement("p");
    chatMessage.innerHTML = message;
    chatArea.append(chatMessage);
    scrollToBottom();
}

function reset() {
    // Återställer innehållet i chattmeddelande-inputfältet
    chatMessageInput.value = "";
}

//När man ansluter till en kanal - joining channel
async function joinChannel() {
    const username = usernameElem.value;
    const password = passwordElem.value;
    const channelId = channelDropdown.value;

    socket.emit("join", username, password, channelId);
    await tokenReceived;
    displayMessages(channelId);
}

function sendMessage() {
    const message = chatMessageInput.value;
    const channelId = channelDropdown.value;

    if (message.startsWith("/broadcast")) {
    const broadcastMessage = message.substring(11); // Ta bort "/broadcast " från början av meddelandet
    socket.emit("broadcast message", broadcastMessage); // Skicka meddelandet till servern för sändning

    } else if (message.startsWith("/createchannel")) {
    // Extrahera kanalnamn och beskrivning från meddelandet
    const params = message.split('"');
    const channelName = params[1];
    const channelDescription = params[3];
    // Skicka kanalnamn och beskrivning till servern för att skapa den nya kanalen
    socket.emit("create channel", channelName, channelDescription, channelId); 

    } else if (message === "/listchannels") {
    // Skicka kommando till servern för att begära listning av kanaler
    socket.emit("list channels");
    
    } else if (message.startsWith("/deletechannel")) {
        // Extrahera indexnumret från meddelandet
        const indexNumber = parseInt(message.split(" ")[1]);
        socket.emit("delete channel", indexNumber);

    }  else if (message.startsWith("/join")) {
    // Extrahera indexnumret från meddelandet
    const indexNumber = parseInt(message.split(" ")[1]);
    const username = usernameElem.value;
    socket.emit("join channel", indexNumber, username);

    } else {
    socket.emit("new message", message, channelId); // Skicka meddelandet till servern
    }
    reset(); // Återställ inputfältet
}


//EVENT LISTENERS - för olika användarinteraktioner

//Login - join-button
submitButton.addEventListener("click", async () => {
    joinChannel();
    showChat();
});

//Enter-knapp fungerar som join - om markering är i username
usernameElem.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        event.preventDefault(); // Förhindra standardbeteendet för formuläret
        joinChannel();
        showChat();
    }
});

//Enter-knapp fungerar som join - om markering är i password
passwordElem.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        event.preventDefault(); // Förhindra standardbeteendet för formuläret
        joinChannel();
        showChat();
    }
});

//Login - Register-button - show register menu
registerSectionButton.addEventListener("click", () => {
    showRegister();
});

registerButton.addEventListener("click", () => {
  const username = registerUsernameElem.value;
  const password = registerPasswordElem.value;
  socket.emit("register", username, password);
  showLogin();
})

//Chat-area - Send-knapp
sendButton.addEventListener("click", () => {
    sendMessage();
});

//Chat-area - Enter-knapp fungerar som send knapp - om markering är i chat-message input
chatMessageInput.addEventListener("keydown", (event) => {
  //Hämta aktuell kanal-id
  const channelId = channelDropdown.value; 
  // Skickar signal till servern när användaren börjar skriva
  socket.emit("typing", channelId);
  if (event.key === "Enter") {
      event.preventDefault(); // Förhindra standardbeteendet för formuläret
      sendMessage();
  }
});

chatMessageInput.addEventListener("keyup", () => {
    // Skickar signal till servern när användaren slutar skriva
    socket.emit("stop typing");
});

// Socket.IO prenumererar på händelser från servern

// Skapa en promise som löser när token mottas
let tokenReceived = new Promise((resolve) => {
    socket.on("token", (token) => {
        // Spara token i klientens minne för framtida användning
        socket.token = token;
        resolve(); // Löser promise när token mottas
    });
});

socket.on("token", (token) => {
    // Spara token i klientens minne för framtida användning
    socket.token = token;
    console.log(socket.token);
});

// Socket.IO prenumererar på händelser från servern
socket.on("user joined", (username) => {
    // Hanterar händelsen: ny användare ansluter + lägger till ett meddelande i chatten
    const chatMessage = username + " joined the chat";
    addChatMessage(chatMessage);
    // Skapa ett nytt <p>-element för det anslutna användarens namn
    const userParagraph = document.createElement("p");
    // Ange texten för <p>-elementet till det anslutna användarens namn
    userParagraph.textContent = username;
    // Lägg till det skapade <p>-elementet i sektionen för anslutna användare
    connectedUsersElem.appendChild(userParagraph);
});

socket.on("user disconnected", (username) => {
    // Hanterar händelsen: ny användare ansluter + lägger till ett meddelande i chatten
    const chatMessage = username + " disconnected from the chat";
    addChatMessage(chatMessage);
    // Loopa igenom alla <p>-element inom sektionen för anslutna användare
    connectedUsersElem.querySelectorAll("p").forEach((paragraph) => {
        // Om texten i det aktuella <p>-elementet matchar användarnamnet som kopplar från
        if (paragraph.textContent === username) {
            // Ta bort det aktuella <p>-elementet från DOM-trädet
            paragraph.remove();
        }
    });
});

//skicka medelande
socket.on("send message", (message) => {
    // Hanterar händelsen: nytt meddelande tas emot + lägger till det i chatten
    addChatMessage(message);
});

socket.on("is typing", (username) => {
    // Hanterar händelsen: någon börjar skriva + visar i UI
    addTypingMessage(username);
});

socket.on("not typing", (username) => {
    // Hanterar händelsen: någon slutar skriva + tar bort från UI
    removeTypingMessage();
});

socket.on("channel list", (channels) => {
  // Skriv ut listan över kanaler
  channels.forEach((channel, index) => {
    if (channel.channelName !== "broadcast") {
      addChatMessage(`${index + 1}. ${channel.channelName} - ${channel.description}`);
    }
  });
});

// Hantera eventuell fel vid borttagning av kanal
socket.on("delete channel error", (errorMessage) => {
  // Visa felmeddelande för användaren
  addChatMessage(errorMessage);
});

// Hantera bekräftelse om att kanalen har tagits bort
socket.on("channel deleted", (indexNumber) => {
  // Uppdatera användargränssnittet eller gör någon annan åtgärd efter borttagning av kanal
  addChatMessage(`Channel ${indexNumber} deleted successfully`);
});

socket.on("display messages", (channelId) => {
  displayMessages(channelId);
});

socket.on("update channel dropdown", (channelId) => {
  channelDropdown.value = channelId;
});
