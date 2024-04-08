let socket = io();
let token;

// //AUTHENTICATE
// async function authenticate(username, password) {
//     const response = await fetch('http://localhost:3000/auth/login', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             username: username,
//             password: password
//         })
//     });

//     const data = await response.json();
//     token = data.token;
// }

//LOGIN - användarnamn, password och login-knapp
const usernameElem = document.querySelector("#username-input");
const passwordElem = document.querySelector("#password-input");
const submitButton = document.querySelector('#login-submit')

//LOGIN-BUTTON
submitButton.addEventListener("click", async () => {
  const username = usernameElem.value;
  const password = passwordElem.value;
  // await authenticate(username, password);
  socket.emit("join", username, password);
  showChat();
});

  // //där meddelanden skrivs ut
  // const form = document.querySelector("#form");
  // const input = document.querySelector("#input");

  //där man skriver in sit tmeddelande
  const chatMessageInput = document.querySelector('#chat-message')
  const sendButton = document.querySelector("#send");

  //const submitButton = document.querySelector('#submitButton');
  const login = document.querySelector(".login");
  const chat = document.querySelector('.chat');

  let chatArea = document.querySelector(".chat-area");

  const connectedUsersElem = document.querySelector(".connected-users");



   
    function showChat() {
        //dölj inloggning och visar chatt-delen av gränsnittet
        login.classList.add("hide");
        chat.classList.add("show");
    };
    

    //när någon skriver -
    function addTypingMessage(username) {
        // Lägger till meddelande om att användaren skriver 
        const typingElem = document.querySelector(".typingMessage");
        typingElem.innerHTML = username + " is typing";
    }
    
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
    
      // Event listeners för olika användarinteraktioner

    //   submitButton.addEventListener("click", () => {
    //     // Hanterar klickhändelsen på submit-knappen
    //     const username = usernameElem.value;
    //     // Skickar användarens namn till servern när den loggar in
    //     socket.emit("join", username);
        
    //     // Visar chattgränssnittet
    //     showChat();
    // });
    
    usernameElem.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Förhindra standardbeteendet för formuläret
            const username = usernameElem.value;
            const password = passwordElem.value;
            await authenticate(username, password); // Lägg till riktigt lösenord här
            socket.emit("join", username, password);
            showChat(); 
        }
      });
  
    sendButton.addEventListener("click", () => {
        // Hanterar klickhändelsen på submit-knappen
        const message = chatMessageInput.value;
        // Skickar det skrivna meddelandet till servern
        socket.emit("new message", message);
      
        // Återställer innehållet i inputfältet för chattmeddelanden
        reset();
      });

      chatMessageInput.addEventListener("keydown", (event) => {
        // Skickar signal till servern när användaren börjar skriva
        socket.emit("typing");
        if (event.key === "Enter") {
            event.preventDefault(); // Förhindra standardbeteendet för formuläret
            const message = chatMessageInput.value;
            socket.emit("new message", message); // Skicka meddelandet till servern
            reset(); // Återställ inputfältet
        }
      });

      chatMessageInput.addEventListener("keyup", () => {
        // Skickar signal till servern när användaren slutar skriva
        socket.emit("stop typing");
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
     })

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

  
    // form.addEventListener("submit", function (e) {
    // e.preventDefault();
    // if (input.value) {
    //     socket.emit("chat message", input.value);
    //     input.value = "";
    // }
    // });