const yts = require('yt-search');

async function handleMediaCommands(command, context) {
    const { sock, sender, msg, args } = context;

    switch (command) {
        case 'ytsearch':
            const query = args.join(' ');
            if (!query) return true;
            try {
                const results = await yts(query);
                const videos = results.videos.slice(0, 5);
                let text = 'YOUTUBE SEARCH\n\n';
                videos.forEach((v, i) => {
                    text += `${i+1}. ${v.title}\n   Duration: ${v.timestamp}\n   URL: ${v.url}\n\n`;
                });
                await sock.sendMessage(sender, { text }, { quoted: msg });
            } catch (err) {
                await sock.sendMessage(sender, { text: 'Search failed.' }, { quoted: msg });
            }
            return true;
        case 'play':
            // Simplify play due to copyright/downloading complexity in simple bots
            await sock.sendMessage(sender, { text: 'Play command is restricted due to server limitations.' }, { quoted: msg });
            return true;
        default:
            return false;
    }
}
module.exports = { handleMediaCommands };
