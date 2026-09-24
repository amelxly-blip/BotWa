const { db } = require('../database/db');

async function handleOwnerCommands(command, context) {
    const { sock, sender, msg, isOwner, args } = context;
    
    // Only owner can run these
    const ownerCommands = ['addsewa', 'delsewa', 'listsewa', 'extendsewa', 'restart', 'eval'];
    if (ownerCommands.includes(command) && !isOwner) {
        await sock.sendMessage(sender, { text: 'Access denied. Owner only.' }, { quoted: msg });
        return true;
    }

    switch (command) {
        case 'addsewa':
            const link = args[0];
            const days = parseInt(args[1]);
            if (!link || isNaN(days)) {
                await sock.sendMessage(sender, { text: 'Usage: .addsewa <link_group> <days>' }, { quoted: msg });
                return true;
            }
            
            // 1. Join group via link
            try {
                const inviteCode = link.split('chat.whatsapp.com/')[1];
                const response = await sock.groupAcceptInvite(inviteCode);
                const groupId = response;
                
                const groupMetadata = await sock.groupMetadata(groupId);
                const groupName = groupMetadata.subject;
                
                const startDate = Date.now();
                const expireDate = startDate + (days * 24 * 60 * 60 * 1000);
                
                db.run(
                    `INSERT INTO rentals (group_id, group_name, invite_link, customer_number, start_date, expire_date, status) 
                     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                    [groupId, groupName, link, msg.key.participant || sender, startDate, expireDate],
                    async (err) => {
                        if (err) throw err;
                        await sock.sendMessage(sender, { 
                            text: `SEWA AKTIF\n\nGroup: ${groupName}\nDurasi: ${days} Hari\nStatus: ACTIVE` 
                        }, { quoted: msg });
                        
                        await sock.sendMessage(groupId, { text: 'Halo! Bot telah aktif di grup ini untuk masa sewa.' });
                    }
                );
            } catch (err) {
                await sock.sendMessage(sender, { text: `Failed to join group: ${err.message}` }, { quoted: msg });
            }
            return true;
            
        case 'listsewa':
            db.all(`SELECT * FROM rentals WHERE status = 'ACTIVE'`, [], async (err, rows) => {
                if (err) return;
                let text = '╭─〔 ACTIVE RENTALS 〕─╮\n\n';
                rows.forEach((r, i) => {
                    const remaining = Math.max(0, Math.ceil((r.expire_date - Date.now()) / (24*60*60*1000)));
                    text += `${i+1}. ${r.group_name}\n   Status : ${r.status}\n   Sisa   : ${remaining} hari\n   Link   : ${r.invite_link}\n\n`;
                });
                text += `Total: ${rows.length} Group Aktif`;
                await sock.sendMessage(sender, { text }, { quoted: msg });
            });
            return true;
            
        case 'delsewa':
            const targetGroupId = args[0]; // Simplify: assume they pass group ID or link
            if (!targetGroupId) return true;
            
            // If it's a link, we'd extract and match, for simplicity assume ID is used, or match by link
            db.run(`UPDATE rentals SET status = 'DELETED' WHERE invite_link = ? OR group_id = ?`, [targetGroupId, targetGroupId], async function(err) {
                if (err) return;
                if (this.changes > 0) {
                    await sock.sendMessage(sender, { text: 'Rental deleted successfully.' }, { quoted: msg });
                    // bot leave group
                    // await sock.groupLeave(groupId);
                } else {
                    await sock.sendMessage(sender, { text: 'Rental not found.' }, { quoted: msg });
                }
            });
            return true;
            
        default:
            return false;
    }
}

module.exports = { handleOwnerCommands };
