# Chat Client for Chat API v1, using socket.io

This is a simple chat client designed to work with Chat API v1, utilizing socket.io for real-time communication.

## Installation

Installation can be done using npm:

```bash
npm install
```

## Usage

To run the chat client, use the following command:

```bash
npm run dev
```

Connect to http://localhost:4000

You'll need to run and point Chat API to a MongoDB host.

Chat API can be found [here](https://github.com/InternetKungen/chat-API_v1)

## Chat Commands

- /listchannels: Lists channels with _index numbers_.
- /broadcast: Broadcasts a message to all channels.
- /join _channel-index-number_: Joins a specific channel using its index number.
- /deletechannel _channel-index-number_: Deletes a channel specified by its index number.
- /createchannel _"channel name"_ _"channel description"_: Creates a new channel with a name and description.

## Link to Chat API v1

For more information on the Chat API v1, visit [this link](https://github.com/InternetKungen/chat-API_v1)
