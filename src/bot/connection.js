const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const { handleMessage } = require('./messages');
const qrcode = require('qrcode');

let sock;
let qrCodeUrl = '';

async function connectToWhatsApp() {
    const sessionPath = path.join(__dirname, '..', '..', 'storage', 'sessions', process.env.SESSION_NAME || 'session');
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`Using wa version v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['MCHLERN BOT', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeUrl = await qrcode.toDataURL(qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('opened connection');
            qrCodeUrl = ''; // Clear QR when connected
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    await handleMessage(sock, msg);
                }
            }
        }
    });
    
    sock.ev.on('group-participants.update', async (update) => {
         // handle welcome/goodbye here
         const { id, participants, action } = update;
         // TODO: trigger welcomeService/goodbyeService
    });
}

function getSock() {
    return sock;
}

function getQR() {
    return qrCodeUrl;
}

module.exports = { connectToWhatsApp, getSock, getQR };
