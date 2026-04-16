import express from 'express';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  auth,
  fido,
  signal,
  WebSocketAdapter,
} from '../src/index.js';
import { 
  storage, 
  events, 
  logger 
} from './adapters.js';

// --- Express App Setup ---

const app = express();
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the chat app HTML
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/index.html'));
});

// Use a session middleware (required by the Liquid Auth middleware)
const sessionMiddleware = session({
  secret: 'my-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    sameSite: 'lax',
  }
});

app.use(sessionMiddleware);
app.use(express.json());

// --- Liquid Auth Capabilities Setup ---

const options = {
  origin: 'https://unhostile-eucarpic-lera.ngrok-free.dev', // Or a function: (ua) => ua.includes('Android') ? 'android:apk-key-hash:...' : '...'
  storage,
  events,
  rpID: 'unhostile-eucarpic-lera.ngrok-free.dev',
  rpName: 'Liquid Auth Example',
  logger,
};

// Mount the split capabilities
app.use('/', auth(options));
app.use('/', fido(options));

// Get the signal handler
const handleSignal = signal(options);

// --- WebSocket Signaling Setup ---

// Create a WebSocket server (noServer: true to handle upgrades manually)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  // Ensure the session middleware is applied before handling the WebSocket
  // This allows the WebSocket handler to access the session from the request
  sessionMiddleware(request as any, {} as any, () => {
    // Only handle WebSocket upgrades on the root site as per Liquid Auth flows
    if (request.url === '/' && request.headers.upgrade === 'websocket') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Use the signal handler
        handleSignal(new WebSocketAdapter(ws), request);
      });
    } else {
      socket.destroy();
    }
  });
});

// --- Start the Server ---

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Available routes:');
  console.log('  GET    /user');
  console.log('  GET    /logout');
  console.log('  POST   /attestation/request');
  console.log('  POST   /attestation/response');
  console.log('  POST   /assertion/request/:credId');
  console.log('  POST   /assertion/response');
  console.log('  WS     / (signaling root, requires session)');
});
