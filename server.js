const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT) || 3000; // Use PORT env var from Docker, fallback to 3000

console.log(`Starting server in ${dev ? 'development' : 'production'} mode`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Working directory: ${__dirname}`);

// Set up Next.js options
const nextConfig = {
  dev,
  hostname,
  port,
  // Enable turbopack in development mode only
  ...(dev ? { turbo: true } : {}),
  // For production builds, use the current directory
  ...(!dev ? { dir: __dirname } : {})
};

// Initialize Next.js
const app = next(nextConfig);
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);

  // Initialize Socket.IO first - it adds its own middleware to the server
  const io = new Server(server, {
    cors: {
      origin: (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging')
        ? ["https://shipwrecked-staging.hackclub.com", "https://shipwrecked.hackclub.com"] 
        : ["http://localhost:9991", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    // Add transports and additional config for production
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    // Configure for production behind proxy/load balancer
    ...((process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') ? {
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6
    } : {})
  });

  // After Socket.IO is initialized, add Express middleware
  // Handle all non-Socket.IO requests with Next.js
  expressApp.all('*', async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.status(500).end('Internal Server Error');
    }
  });

  console.log(`Socket.IO server initialized for environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origins:`, (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging')
    ? ["https://shipwrecked-staging.hackclub.com", "https://shipwrecked.hackclub.com"] 
    : ["http://localhost:9991", "http://localhost:3000"]);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'from:', socket.handshake.address);

    // Join a project chat room
    socket.on('join-project-chat', (projectId) => {
      socket.join(`project-${projectId}`);
      console.log(`Socket ${socket.id} joined project-${projectId}`);
    });

    // Leave a project chat room
    socket.on('leave-project-chat', (projectId) => {
      socket.leave(`project-${projectId}`);
      console.log(`Socket ${socket.id} left project-${projectId}`);
    });

    // Handle new chat messages
    socket.on('new-message', (data) => {
      const { projectId, message, userId } = data;
      
      // Broadcast message to all users in the project room - only userId, no real user data
      socket.to(`project-${projectId}`).emit('message-received', {
        id: Date.now().toString(), // Temporary ID until database save
        content: message,
        userId: userId,
        createdAt: new Date().toISOString()
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('User disconnected:', socket.id, 'reason:', reason);
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.log('Socket connection error:', socket.id, error);
    });
  });

  // Add Socket.IO server error handling
  io.engine.on('connection_error', (err) => {
    console.log('Socket.IO connection error:', err.req?.url, err.code, err.message);
  });

  // Set a short timeout to fail fast rather than waiting
  server.setTimeout(0);
  
  // Handle error during server listen
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`\x1b[31mError: Port ${port} is already in use.\x1b[0m`);
      console.error('Please ensure no other processes are using this port before starting the application.');
      process.exit(1);
    } else {
      console.error('Server error:', e);
      process.exit(1);
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    const address = server.address();
    console.log(`> Ready on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${address.port}`);
  });
}); 