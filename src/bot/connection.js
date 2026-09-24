const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const { handleMessage } = require('./messages');
const qrcode = require('qrcode');

let sock;
let qrCodeUrl = '';
let isConnected = false;

const sessionPath = path.join(__dirname, '..', '..', 'storage', 'sessions', process.env.SESSION_NAME || 'session');

async function connectToWhatsApp() {
    // Pastikan folder session ada
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`[BOT] WA Version: v${version.join('.')} | Latest: ${isLatest}`);

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        // Pakai browser fingerprint yang stabil agar tidak mudah kicked oleh WA
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        // Jangan hapus session saat koneksi putus
        markOnlineOnConnect: false
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeUrl = await qrcode.toDataURL(qr);
            console.log('[BOT] New QR Code generated. Scan via web dashboard.');
        }

        if (connection === 'open') {
            isConnected = true;
            qrCodeUrl = '';
            console.log('[BOT] ✅ WhatsApp Connected!');
        }

        if (connection === 'close') {
            isConnected = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = Object.keys(DisconnectReason).find(
                k => DisconnectReason[k] === statusCode
            ) || statusCode;

            console.log(`[BOT] ❌ Connection closed. Reason: ${reason} (${statusCode})`);

            if (statusCode === DisconnectReason.loggedOut) {
                // Benar-benar di-logout dari HP (Linked Devices > Logout)
                // Hapus session agar QR baru bisa muncul
                console.log('[BOT] Logged out by user. Clearing session...');
                try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (_) {}
                qrCodeUrl = '';
                // Reconnect untuk tampilkan QR baru
                setTimeout(connectToWhatsApp, 3000);

            } else if (statusCode === DisconnectReason.connectionReplaced) {
                // Ada sesi lain yang login dengan nomor yang sama
                console.log('[BOT] ⚠️ Connection replaced by another session. Not reconnecting.');

            } else if (statusCode === DisconnectReason.badSession) {
                // File session corrupt
                console.log('[BOT] Bad session file. Clearing and reconnecting...');
                try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (_) {}
                setTimeout(connectToWhatsApp, 3000);

            } else {
                // Disconnect biasa (internet putus, timeout, dll) — reconnect otomatis
                console.log('[BOT] Reconnecting in 5s...');
                setTimeout(connectToWhatsApp, 5000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    try {
                        await handleMessage(sock, msg);
                    } catch (err) {
                        console.error('[BOT] Error handling message:', err.message);
                    }
                }
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        // Welcome/Goodbye akan ditangani di sini
        // TODO: import welcomeService dan goodbyeService
        console.log(`[GROUP] ${action} in ${id}:`, participants);
    });
}

function getSock() { return sock; }
function getQR() { return qrCodeUrl; }
function getIsConnected() { return isConnected; }

async function resetSession() {
    console.log('[BOT] Manual session reset triggered.');
    if (sock) {
        try { await sock.end(); } catch (_) {}
    }
    isConnected = false;
    qrCodeUrl = '';
    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (_) {}
    setTimeout(connectToWhatsApp, 2000);
}

module.exports = { connectToWhatsApp, getSock, getQR, getIsConnected, resetSession };
