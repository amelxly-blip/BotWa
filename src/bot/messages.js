const { getPrefix, isOwner } = require('../utils/helpers');
const { handleGeneralCommands } = require('../commands/general');
const { handleOwnerCommands } = require('../commands/owner');
const { handleRentalCommands } = require('../commands/rental');
const { handleGroupCommands } = require('../commands/group');
const { handleMediaCommands } = require('../commands/media');
const { handleRobloxCommands } = require('../commands/roblox');
const { db } = require('../database/db');

async function handleMessage(sock, msg) {
    try {
        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
        const sender = msg.key.remoteJid;
        const participant = msg.key.participant || sender; // For groups
        const isGroup = sender.endsWith('@g.us');
        
        if (isGroup) {
            // Track chat analytics
            db.run(
                `INSERT INTO chat_stats (group_id, user_id, message_count, last_chat) 
                 VALUES (?, ?, 1, ?) 
                 ON CONFLICT(group_id, user_id) DO UPDATE SET message_count = message_count + 1, last_chat = ?`,
                [sender, participant, Date.now(), Date.now()]
            );
        }

        const prefix = getPrefix();
        if (!messageContent.startsWith(prefix)) return;

        const args = messageContent.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        const context = { sock, msg, args, sender, participant, isGroup, isOwner: isOwner(participant) };

        // Command routing
        let handled = await handleGeneralCommands(command, context);
        if (!handled) handled = await handleOwnerCommands(command, context);
        if (!handled) handled = await handleRentalCommands(command, context);
        if (!handled) handled = await handleGroupCommands(command, context);
        if (!handled) handled = await handleMediaCommands(command, context);
        if (!handled) handled = await handleRobloxCommands(command, context);

    } catch (error) {
        console.error('Error handling message:', error);
    }
}

module.exports = { handleMessage };
