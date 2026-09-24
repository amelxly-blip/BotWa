const cron = require('node-cron');
const { db } = require('../database/db');
const { getSock } = require('../bot/connection');

function startScheduler() {
    // Run every minute
    cron.schedule('* * * * *', () => {
        const sock = getSock();
        if (!sock) return;

        const now = Date.now();
        db.all(`SELECT * FROM rentals WHERE status = 'ACTIVE' AND expire_date <= ?`, [now], async (err, rows) => {
            if (err) return console.error(err);
            for (const row of rows) {
                try {
                    await sock.sendMessage(row.group_id, { text: 'Masa sewa bot telah berakhir. Bot akan keluar dari grup.' });
                    await sock.groupLeave(row.group_id);
                    
                    db.run(`UPDATE rentals SET status = 'EXPIRED' WHERE id = ?`, [row.id]);
                    console.log(`Rental EXPIRED for group: ${row.group_name}`);
                } catch (e) {
                    console.error(`Failed to leave group ${row.group_id}:`, e);
                }
            }
        });

        // Reminder 1 day before
        const oneDayFuture = now + (24 * 60 * 60 * 1000);
        const oneDayFutureGrace = oneDayFuture + (60 * 1000); // 1 min grace
        
        db.all(`SELECT * FROM rentals WHERE status = 'ACTIVE' AND expire_date > ? AND expire_date <= ?`, [oneDayFuture, oneDayFutureGrace], async (err, rows) => {
            if (err) return;
            for (const row of rows) {
                 try {
                     await sock.sendMessage(row.group_id, { text: `⚠ RENTAL REMINDER\n\nGroup: ${row.group_name}\n\nMasa sewa akan berakhir 1 hari lagi. Silakan hubungi owner untuk memperpanjang.` });
                 } catch (e) {}
            }
        });
    });
}

module.exports = { startScheduler };
