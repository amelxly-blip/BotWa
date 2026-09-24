const { db } = require('../database/db');

async function handleGroupCommands(command, context) {
    const { sock, sender, msg, isGroup } = context;
    if (!isGroup) return false;

    switch (command) {
        case 'totalchat':
            db.all(
                `SELECT user_id, message_count FROM chat_stats WHERE group_id = ? ORDER BY message_count DESC LIMIT 10`, 
                [sender], 
                async (err, rows) => {
                    if (err) return;
                    let text = 'TOTAL CHAT\n\n';
                    rows.forEach((r, i) => {
                        text += `${i+1}. @${r.user_id.split('@')[0]}\n   Pesan: ${r.message_count}\n\n`;
                    });
                    const mentions = rows.map(r => r.user_id);
                    await sock.sendMessage(sender, { text, mentions }, { quoted: msg });
                }
            );
            return true;
        case 'tagall':
            const groupMetadata = await sock.groupMetadata(sender);
            const participants = groupMetadata.participants.map(p => p.id);
            let text = 'Tag All:\n\n';
            participants.forEach(p => text += `@${p.split('@')[0]}\n`);
            await sock.sendMessage(sender, { text, mentions: participants }, { quoted: msg });
            return true;
        default:
            return false;
    }
}
module.exports = { handleGroupCommands };
