# Real-Time Chat System Low Level Design (LLD)

## Live link: https://miniteamchat.vercel.app

## 1. System Overview

A complete real-time chat system supporting:

- Multi-channel messaging  
- Private channel creation  
- Join-request / approval workflow  
- Real-time presence (online/offline tracking)    
- Optimistic message sending  
- Pagination + infinite scroll  
- Role-based controls (creator-only actions)  
- OAuth authentication  
- WebSocket synchronization across all clients  

---

## 2. Low Level Design (LLD)

### 2.1 Core Architecture

#### **Client**

- Built using **React + Redux Toolkit**
- Handles UI, global state, optimistic updates
- **Socket.IO client** for real-time events  
- **REST API** for:
  - Channel list
  - Join requests
  - Members list
  - Pagination
  - Message history

#### **Server**

- **Express.js REST API**
- **MongoDB + Mongoose**
- **Socket.IO** for:
  - Messaging
  - Presence
  - Membership updates

---

### 2.2 Data Models

#### **User**
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "avatarUrl": "string"
}
```
#### **Channel**
```json
{
  "_id": "ObjectId",
  "name": "string",
  "createdBy": "userId",
  "isPrivate": true,
  "members": ["userId"],
  "pendingRequests": ["userId"]
}
```
#### **Channel**
```json
{
  "_id": "ObjectId",
  "channelId": "ObjectId",
  "senderId": "userId",
  "text": "string",
  "attachments": [],
  "createdAt": "Date",
  "editedAt": "Date",
  "deleted": false,
  "clientId": "string"
}
```

## 2.3 REST Endpoints

### Auth
**POST** `/api/auth/login`  
**POST** `/api/auth/logout`

### Channels
**GET** `/api/channels?mine=true`  
**POST** `/api/channels`  
**POST** `/api/channels/:id/join-request`  
**POST** `/api/channels/:id/approve-request`  
**POST** `/api/channels/:id/reject-request`  
**POST** `/api/channels/:id/leave`  
**DELETE** `/api/channels/:id`  
**GET** `/api/channels/:id/members`  
**POST** `/api/channels/:id/remove-member`  
**GET** `/api/channels/search?q=term`

### Messages
**GET** `/api/messages?channelId=...&limit=30&before=<messageId>`  
**POST** `/api/messages`  
**PATCH** `/api/messages/:id`  
**DELETE** `/api/messages/:id`


## 2.4 Socket.IO Events

### Client → Server
- `channel:join`
- `channel:leave`
- `message:new`
- `message:edit`
- `message:delete`

### Server → Client
- `message:received`
- `message:edited`
- `message:deleted`
- `presence:update``
- `channel:members:updated`
- `channel:joinRequest`
- `channel:request:approved`
- `channel:request:rejected`
- `channel:member:left`
- `channel:deleted`


## 2.5 Real-Time Features

### Presence Tracking
- A user can have multiple active sockets.
- First connection means they are online.
- After the last socket disconnects, they are offline.


## Optimistic Messaging

- UI sends a message with a `clientId`.
- When the server confirms, the optimistic message is replaced with the real one.

---

## Message Pagination

- Load the latest 40 messages when entering a channel.
- When scrolling to the top, load older messages using:  
  `GET /api/messages?before=<firstMessageId>`
- Keep the scroll position stable after loading more.


## Client Folder Structure
```pgsql
client/
│── src/
│   ├── api/
│   │   ├── axiosInstance.js
│   │   ├── authApi.js
│   │   └── messagesApi.js
│   ├── components/
│   │   ├── chat/
│   │   │   ├── MessageList.jsx
│   │   │   ├── MessageItem.jsx
│   │   │   └── MessageInput.jsx
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── RightPanel.jsx
│   │   └── common/
│   ├── hooks/
│   │   ├── useSocket.js
│   │   ├── useTyping.js
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── messagesSlice.js
│   │   │   ├── channelsSlice.js
│   │   │   ├── presenceSlice.js
│   │   │   └── typingSlice.js
│   ├── utils/
│   │   └── avatar.js
│   ├── App.jsx
│   ├── main.jsx
│── package.json
│── vite.config.js
```
## Server Folder Structure
```pgsql
server/
│── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── channelController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Channel.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── channels.routes.js
│   │   └── messages.routes.js
│   ├── sockets/
│   │   └── index.js
│   ├── utils/
│   │   ├── jwt.js
│   ├── index.js
│── package.json
```
# Server Setup

```bash
cd server
npm install
```
#### Create .env
```bash
MONGO_URI=mongodb://localhost:27017/team-chat
JWT_SECRET=your-secret
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

#### Run:
```bash
npm start
```

# Client Setup

```bash
cd client
npm install
```
#### Create .env
```bash
VITE_API_URL=http://localhost:4000/
```

#### Run:
```bash
npm run dev
```

## 4. How to Use the App

- Signup/login based on jwt 
- Create channels  
- Search, join, and view pending requests  
- Creator can approve or reject join requests  
- Real-time chat  
- Online and offline indicators   
- Load older messages while scrolling  
- Leave or delete channels  
- remove or approve members
- Creator can manage members

## 5. Completed Features

- Jwt login  
- Slack-like interface  
- Private channels  
- Search channels  
- Join requests with approval flow  
- Leave channel  
- Delete channel  
- Remove members  
- Real-time presence  
- Optimistic messaging  
- Infinite scroll with pagination  
- Real-time message syncing  
- Member panel syncing  
- Correct message alignment  
- Persistent MongoDB storage 
