/mini-team-chat/                       <-- repo root
├── README.md
├── .env.example
├── package.json                       <-- optional monorepo helper (scripts)
├── server/                            <-- backend (Node, Express, Socket.IO, MongoDB)
│   ├── package.json
│   ├── tsconfig.json (optional if using TS)
│   ├── .env
│   ├── src/
│   │   ├── index.js                   <-- entry: start server + socket
│   │   ├── app.js                     <-- express app setup (routes, middleware)
│   │   ├── config/
│   │   │   ├── db.js                  <-- mongodb connection (mongoose)
│   │   │   └── passport.js            <-- oauth2 / strategies (or auth helpers)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── channelController.js
│   │   │   └── messageController.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Channel.js
│   │   │   └── Message.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── channels.routes.js
│   │   │   └── messages.routes.js
│   │   ├── services/
│   │   │   ├── presenceService.js    <-- online/offline tracking
│   │   │   └── paginationService.js
│   │   ├── sockets/
│   │   │   ├── index.js               <-- socket.io init + namespaces/rooms
│   │   │   └── handlers/
│   │   │       ├── messageHandler.js
│   │   │       └── presenceHandler.js
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js      <-- JWT/session validation
│   │   │   └── errorHandler.js
│   │   └── utils/
│   │       ├── jwt.js
│   │       └── validators.js
│   ├── tests/                         <-- optional unit/integration tests
│   └── Dockerfile                     <-- optional for deployment
│
├── client/                            <-- frontend (Vite + React + Redux + Tailwind)
│   ├── package.json
│   ├── vite.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── main.jsx                   <-- React entry, Redux store init, Router
│   │   ├── App.jsx
│   │   ├── api/
│   │   │   ├── axiosInstance.js       <-- base API + auth interceptors
│   │   │   └── authApi.js
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── channelsSlice.js
│   │   │   │   ├── messagesSlice.js
│   │   │   │   └── presenceSlice.js
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   └── useInfiniteMessages.js
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Signup.jsx
│   │   │   └── Chat/
│   │   │       ├── Workspace.jsx      <-- top-level chat layout
│   │   │       └── ChannelView.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx        <-- channel list, create channel button
│   │   │   │   ├── ChannelList.jsx
│   │   │   │   └── Topbar.jsx
│   │   │   ├── chat/
│   │   │   │   ├── MessageList.jsx    <-- virtualized/infinite loader
│   │   │   │   ├── MessageItem.jsx
│   │   │   │   ├── MessageInput.jsx
│   │   │   │   └── TypingIndicator.jsx (optional bonus)
│   │   │   ├── common/
│   │   │   │   ├── Avatar.jsx
│   │   │   │   └── Modal.jsx
│   │   │   └── ui/                    <-- small UI primitives or copied components
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── utils/
│   │       └── time.js                 <-- timestamp formatting
│   └── Dockerfile
│
├── infra/                             <-- optional: deployment scripts
│   ├── docker-compose.yml
│   └── terraform/                     <-- or cloud setup notes
└── docs/
    ├── architecture.md
    └── demo-instructions.md
