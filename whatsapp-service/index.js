const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Logger
const logger = pino({ level: 'info' });

// Base directory for all session auth data
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ===== Multi-Session State =====
// Map<sessionId, { sock, latestQr, isConnected, connectedUser, isConnecting }>
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sock: null,
      latestQr: null,
      isConnected: false,
      connectedUser: null,
      isConnecting: false,
    });
  }
  return sessions.get(sessionId);
}

function getAuthDir(sessionId) {
  return path.join(SESSIONS_DIR, sessionId);
}

// Migrate legacy auth_info_baileys to sessions/superadmin (one-time)
function migrateLegacyAuth() {
  const legacyDir = path.join(__dirname, 'auth_info_baileys');
  const superadminDir = getAuthDir('superadmin');

  if (fs.existsSync(legacyDir) && !fs.existsSync(superadminDir)) {
    try {
      fs.renameSync(legacyDir, superadminDir);
      logger.info('Migrated legacy auth_info_baileys to sessions/superadmin');
    } catch (err) {
      logger.error('Failed to migrate legacy auth: ' + err.message);
    }
  }
}

async function connectSession(sessionId) {
  const session = getSession(sessionId);

  if (session.isConnecting) return;
  session.isConnecting = true;

  const authDir = getAuthDir(sessionId);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    // Fetch latest WhatsApp version to prevent connection failure (405 Method Not Allowed)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1035194821] }));
    logger.info(`[${sessionId}] Starting Baileys socket with WhatsApp Web Version: ${version.join('.')}`);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: [`NaPOS-${sessionId}`, 'Chrome', '1.0.0']
    });

    session.sock = sock;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          session.latestQr = await qrcode.toDataURL(qr);
          session.isConnected = false;
          session.connectedUser = null;
          logger.info(`[${sessionId}] New QR code generated`);
        } catch (err) {
          logger.error(`[${sessionId}] Failed to generate QR: ${err.message}`);
        }
      }

      if (connection === 'close') {
        session.isConnected = false;
        session.connectedUser = null;
        session.latestQr = null;
        session.isConnecting = false;

        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        logger.info(`[${sessionId}] Connection closed. Reason: ${lastDisconnect?.error?.message || 'unknown'}. Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => connectSession(sessionId), 5000);
        } else {
          logger.warn(`[${sessionId}] User logged out. Cleaning session data...`);
          cleanupSession(sessionId);
          setTimeout(() => connectSession(sessionId), 2000);
        }
      } else if (connection === 'open') {
        session.isConnected = true;
        session.latestQr = null;
        session.isConnecting = false;

        const userJid = sock.user.id;
        session.connectedUser = userJid.split(':')[0] || userJid.split('@')[0];
        logger.info(`[${sessionId}] WhatsApp connected for: ${session.connectedUser}`);
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    logger.error(`[${sessionId}] Error starting WhatsApp client: ${err.message}`);
    session.isConnecting = false;
    setTimeout(() => connectSession(sessionId), 5000);
  }
}

function cleanupSession(sessionId) {
  const authDir = getAuthDir(sessionId);
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      logger.info(`[${sessionId}] Cleaned up session folder`);
    }
  } catch (err) {
    logger.error(`[${sessionId}] Failed to cleanup session: ${err.message}`);
  }
}

// Helper to extract sessionId from request
function resolveSessionId(req) {
  return req.query.sessionId || req.body?.sessionId || 'superadmin';
}

// ===== Initial startup =====
migrateLegacyAuth();
connectSession('superadmin');

// Auto-start any existing tenant sessions
try {
  const existingDirs = fs.readdirSync(SESSIONS_DIR);
  for (const dir of existingDirs) {
    if (dir !== 'superadmin' && fs.statSync(path.join(SESSIONS_DIR, dir)).isDirectory()) {
      logger.info(`Auto-starting existing session: ${dir}`);
      connectSession(dir);
    }
  }
} catch (err) {
  logger.error('Failed to scan existing sessions: ' + err.message);
}

// ===== HTTP Endpoints =====

// 1. Get current status for a session
app.get('/status', (req, res) => {
  const sessionId = resolveSessionId(req);
  const session = getSession(sessionId);
  res.json({
    connected: session.isConnected,
    phone: session.connectedUser,
    sessionId,
  });
});

// 2. Get QR Code for a session (also starts the session if not running)
app.get('/qr', async (req, res) => {
  const sessionId = resolveSessionId(req);
  const session = getSession(sessionId);

  // Start the session if not already running
  if (!session.isConnecting && !session.isConnected && !session.sock) {
    connectSession(sessionId);
    // Wait a moment for the QR to generate
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (session.isConnected) {
    return res.status(400).json({ message: 'WhatsApp already connected.' });
  }
  if (!session.latestQr) {
    return res.status(202).json({ message: 'QR code not generated yet, please try again in a few seconds.' });
  }
  res.json({ qr: session.latestQr });
});

// 3. Logout/Disconnect a session
app.post('/logout', async (req, res) => {
  const sessionId = resolveSessionId(req);
  const session = getSession(sessionId);

  logger.info(`[${sessionId}] Disconnect request received`);
  try {
    if (session.sock) {
      await session.sock.logout().catch(() => {});
      session.sock.end();
    }
    cleanupSession(sessionId);
    session.sock = null;
    session.isConnected = false;
    session.connectedUser = null;
    session.latestQr = null;
    session.isConnecting = false;

    // Restart the session
    setTimeout(() => connectSession(sessionId), 1000);

    res.json({ success: true, message: 'WhatsApp disconnected successfully.' });
  } catch (err) {
    logger.error(`[${sessionId}] Error in logout: ${err.message}`);
    res.status(500).json({ success: false, message: 'Error disconnecting WhatsApp: ' + err.message });
  }
});

// 4. Send Message via a specific session
app.post('/send-message', async (req, res) => {
  const { phone, message, sessionId: bodySessionId } = req.body;
  const sessionId = req.query.sessionId || bodySessionId || 'superadmin';
  const session = getSession(sessionId);

  if (!phone || !message) {
    return res.status(400).json({ error: 'Parameters "phone" and "message" are required.' });
  }

  if (!session.isConnected || !session.sock) {
    return res.status(400).json({ error: `WhatsApp session "${sessionId}" is not connected.` });
  }

  // Format phone number to WhatsApp JID format
  let cleanedPhone = phone.replace(/[^0-9]/g, '');

  if (cleanedPhone.startsWith('0')) {
    cleanedPhone = '62' + cleanedPhone.slice(1);
  }

  if (!cleanedPhone.startsWith('62') && cleanedPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number format. Indonesia numbers should start with 08 or 628.' });
  }

  try {
    logger.info(`[${sessionId}] Sending message to: ${cleanedPhone}`);

    const [result] = await session.sock.onWhatsApp(cleanedPhone);
    if (!result || !result.exists) {
      logger.warn(`[${sessionId}] Phone ${cleanedPhone} is not registered on WhatsApp`);
      return res.status(404).json({ error: `Phone number ${cleanedPhone} is not registered on WhatsApp.` });
    }

    const sentMessage = await session.sock.sendMessage(result.jid, { text: message });
    res.json({
      success: true,
      messageId: sentMessage.key.id
    });
  } catch (err) {
    logger.error(`[${sessionId}] Failed to send message to ${cleanedPhone}: ${err.message}`);
    res.status(500).json({ error: 'Failed to send message: ' + err.message });
  }
});

// 5. List all active sessions (utility endpoint for admin)
app.get('/sessions', (req, res) => {
  const result = [];
  for (const [id, session] of sessions.entries()) {
    result.push({
      sessionId: id,
      connected: session.isConnected,
      phone: session.connectedUser,
    });
  }
  res.json({ sessions: result });
});

app.listen(PORT, () => {
  logger.info(`WhatsApp microservice (multi-session) listening on port ${PORT}`);
});
