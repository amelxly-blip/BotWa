const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getQR, getSock, resetSession } = require('../bot/connection');
const { db } = require('../database/db');

// Setup multer for image uploads
const storageDir = path.join(__dirname, '..', '..', 'storage', 'images');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, storageDir),
        filename: (req, file, cb) => {
            // type comes from route param: menu, welcome, goodbye
            const type = req.params.type || 'misc';
            const ext = path.extname(file.originalname);
            cb(null, `${type}${ext}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

function startServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // ─── STATUS ────────────────────────────────────────────────
    app.get('/api/status', (req, res) => {
        const sock = getSock();
        res.json({
            online: !!sock && !getQR(),
            qr: getQR()
        });
    });

    // ─── RESET SESSION (Generate New QR) ──────────────────────
    app.post('/api/reset-session', async (req, res) => {
        try {
            await resetSession();
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── IMAGE UPLOAD ──────────────────────────────────────────
    // type = menu | welcome | goodbye
    app.post('/api/upload/:type', upload.single('image'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        res.json({ success: true, filename: req.file.filename });
    });

    // Serve uploaded images (so they can be previewed in the panel)
    app.use('/images', express.static(storageDir));

    // ─── RENTALS ───────────────────────────────────────────────
    app.get('/api/rentals', (req, res) => {
        db.all('SELECT * FROM rentals', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    app.post('/api/rentals', async (req, res) => {
        const { link, days } = req.body;
        const sock = getSock();
        if (!sock) return res.status(500).json({ error: 'Bot not connected' });

        try {
            const inviteCode = link.split('chat.whatsapp.com/')[1];
            if (!inviteCode) return res.status(400).json({ error: 'Invalid WhatsApp link' });

            const groupId = await sock.groupAcceptInvite(inviteCode);
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject;

            const startDate = Date.now();
            const expireDate = startDate + (days * 24 * 60 * 60 * 1000);

            db.run(
                `INSERT INTO rentals (group_id, group_name, invite_link, customer_number, start_date, expire_date, status) 
                 VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                [groupId, groupName, link, 'WEB', startDate, expireDate],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, groupName, id: this.lastID });
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.delete('/api/rentals/:id', async (req, res) => {
        // Fetch rental first to get group_id for leaving
        db.get(`SELECT * FROM rentals WHERE id = ?`, [req.params.id], async (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Rental not found' });

            // Mark as deleted
            db.run(`UPDATE rentals SET status = 'DELETED' WHERE id = ?`, [req.params.id], async function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                // Try to leave the group
                try {
                    const sock = getSock();
                    if (sock && row.group_id) {
                        await sock.sendMessage(row.group_id, { text: 'Masa sewa telah dihapus oleh owner. Bot akan keluar dari grup.' });
                        await sock.groupLeave(row.group_id);
                    }
                } catch (leaveErr) {
                    console.error('Could not leave group:', leaveErr.message);
                }

                res.json({ success: true });
            });
        });
    });

    app.listen(port, '0.0.0.0', () => {
        console.log(`Web Dashboard: http://0.0.0.0:${port}`);
    });
}

module.exports = { startServer };
