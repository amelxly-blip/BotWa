const { formatDuration } = require('../utils/helpers');

const startTime = Date.now();

async function handleGeneralCommands(command, context) {
    const { sock, sender, msg } = context;
    
    switch (command) {
        case 'menu':
            const menuText = `
╭━━〔 MCHLERN BOT 〕━━╮
┃ Status   : ONLINE
┃ Version  : V1.0.0
┃ Runtime  : ${formatDuration(Date.now() - startTime)}
╰━━━━━━━━━━━━━━━━━━╯

┌─〔 GENERAL 〕
│ .menu
│ .ping
│ .runtime
│ .owner
│ .status
└──────────────
┌─〔 GROUP 〕
│ .totalchat
│ .topchat
│ .welcome
│ .goodbye
│ .tagall
│ .hidetag
└──────────────
┌─〔 MEDIA 〕
│ .play <judul>
│ .ytsearch <query>
└──────────────
┌─〔 ROBLOX 〕
│ .userinfo <username>
└──────────────
            `;
            await sock.sendMessage(sender, { text: menuText }, { quoted: msg });
            return true;
            
        case 'ping':
            await sock.sendMessage(sender, { text: 'Pong!' }, { quoted: msg });
            return true;
            
        case 'runtime':
            await sock.sendMessage(sender, { text: `Runtime: ${formatDuration(Date.now() - startTime)}` }, { quoted: msg });
            return true;
            
        case 'owner':
            await sock.sendMessage(sender, { text: `Owner: wa.me/${process.env.OWNER_NUMBER}` }, { quoted: msg });
            return true;
            
        case 'status':
            await sock.sendMessage(sender, { text: `Bot is ONLINE and running smoothly.` }, { quoted: msg });
            return true;
            
        default:
            return false;
    }
}

module.exports = { handleGeneralCommands };
