const express = require('express');
const cors = require('cors');
const path = require('path');
const { getQR, getSock } = require('../bot/connection');
const { db } = require('../database/db');

function startServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // API Routes
    app.get('/api/status', (req, res) => {
        const sock = getSock();
        res.json({
            online: !!sock && !getQR(),
            qr: getQR()
        });
    });

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
            const groupId = await sock.groupAcceptInvite(inviteCode);
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject;
            
            const startDate = Date.now();
            const expireDate = startDate + (days * 24 * 60 * 60 * 1000);
            
            db.run(
                `INSERT INTO rentals (group_id, group_name, invite_link, customer_number, start_date, expire_date, status) 
                 VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                [groupId, groupName, link, 'WEB', startDate, expireDate],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, groupName });
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.delete('/api/rentals/:id', (req, res) => {
        db.run(`UPDATE rentals SET status = 'DELETED' WHERE id = ?`, [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        });
    });

    app.listen(port, '0.0.0.0', () => {
        console.log(`Web Dashboard running on http://0.0.0.0:${port}`);
    });
}

module.exports = { startServer };
