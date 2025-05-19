const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

// Set up Next.js options
const nextConfig = {
  dev,
  hostname,
  port,
  // Enable turbopack in development mode
  ...(dev ? { turbo: true } : {})
};

// Initialize Next.js
const app = next(nextConfig);
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
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