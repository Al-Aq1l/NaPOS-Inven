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

// State variables
let sock = null;
let latestQr = null;
let isConnected = false;
let connectedUser = null;
let isConnecting = false;

// Logger
const logger = pino({ level: 'info' });

// Auth state directory
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Fetch latest WhatsApp version to prevent connection failure (405 Method Not Allowed)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1035194821] }));
    logger.info(`Starting Baileys socket with WhatsApp Web Version: ${version.join('.')}`);

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }), // reduce terminal noise
      browser: ['NaPOS Receipt Sender', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          // Convert QR code to base64 image URL
          latestQr = await qrcode.toDataURL(qr);
          isConnected = false;
          connectedUser = null;
          logger.info('New WhatsApp QR code generated');
        } catch (err) {
          logger.error('Failed to generate QR data URL: ' + err.message);
        }
      }

      if (connection === 'close') {
        isConnected = false;
        connectedUser = null;
        latestQr = null;
        isConnecting = false;

        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        logger.info(`Connection closed. Reason: ${lastDisconnect?.error?.message || 'unknown'}. Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          // Reconnect with a delay to prevent spamming
          setTimeout(connectToWhatsApp, 5000);
        } else {
          logger.warn('User logged out. Cleaning session data...');
          cleanupSession();
          setTimeout(connectToWhatsApp, 2000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        latestQr = null;
        isConnecting = false;
        
        // Extract connection info
        const userJid = sock.user.id;
        connectedUser = userJid.split(':')[0] || userJid.split('@')[0];
        logger.info(`WhatsApp connection successfully opened for: ${connectedUser}`);
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    logger.error('Error starting WhatsApp client: ' + err.message);
    isConnecting = false;
    setTimeout(connectToWhatsApp, 5000);
  }
}

function cleanupSession() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      // Recursive delete folder contents
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      logger.info('Cleaned up session folder auth_info_baileys');
    }
  } catch (err) {
    logger.error('Failed to cleanup session folder: ' + err.message);
  }
}

// Initial connection
connectToWhatsApp();

// HTTP Endpoints

// 1. Get current status
app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    phone: connectedUser
  });
});

// 2. Get QR Code
app.get('/qr', (req, res) => {
  if (isConnected) {
    return res.status(400).json({ message: 'WhatsApp already connected.' });
  }
  if (!latestQr) {
    return res.status(202).json({ message: 'QR code not generated yet, please try again in a few seconds.' });
  }
  res.json({ qr: latestQr });
});

// 3. Logout/Disconnect
app.post('/logout', async (req, res) => {
  logger.info('Disconnect request received');
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock.end();
    }
    cleanupSession();
    isConnected = false;
    connectedUser = null;
    latestQr = null;
    
    // Restart WhatsApp client
    setTimeout(connectToWhatsApp, 1000);
    
    res.json({ success: true, message: 'WhatsApp disconnected successfully.' });
  } catch (err) {
    logger.error('Error in logout: ' + err.message);
    res.status(500).json({ success: false, message: 'Error disconnecting WhatsApp: ' + err.message });
  }
});

// 4. Send Receipt Message
app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Parameters "phone" and "message" are required.' });
  }

  if (!isConnected || !sock) {
    return res.status(400).json({ error: 'WhatsApp client is not connected.' });
  }

  // Format phone number to WhatsApp JID format (e.g. 628123456789@s.whatsapp.net)
  let cleanedPhone = phone.replace(/[^0-9]/g, '');
  
  // Convert local Indonesia prefix "08..." to standard international format "628..."
  if (cleanedPhone.startsWith('0')) {
    cleanedPhone = '62' + cleanedPhone.slice(1);
  }
  
  if (!cleanedPhone.startsWith('62') && cleanedPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number format. Indonesia numbers should start with 08 or 628.' });
  }

  const jid = `${cleanedPhone}@s.whatsapp.net`;

  try {
    logger.info(`Sending receipt message to: ${cleanedPhone}`);
    
    // Check if number exists on WhatsApp first
    const [result] = await sock.onWhatsApp(cleanedPhone);
    if (!result || !result.exists) {
      logger.warn(`Phone number ${cleanedPhone} is not registered on WhatsApp`);
      return res.status(404).json({ error: `Phone number ${cleanedPhone} is not registered on WhatsApp.` });
    }

    const sentMessage = await sock.sendMessage(result.jid, { text: message });
    res.json({
      success: true,
      messageId: sentMessage.key.id
    });
  } catch (err) {
    logger.error(`Failed to send message to ${cleanedPhone}: ` + err.message);
    res.status(500).json({ error: 'Failed to send message: ' + err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`WhatsApp microservice listening on port ${PORT}`);
});
