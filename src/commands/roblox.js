const axios = require('axios');

async function handleRobloxCommands(command, context) {
    const { sock, sender, msg, args } = context;

    switch (command) {
        case 'userinfo':
            const username = args[0];
            if (!username) return true;
            try {
                // Get user ID from username
                const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
                    usernames: [username],
                    excludeBannedUsers: false
                });
                const user = res.data.data[0];
                if (!user) {
                    await sock.sendMessage(sender, { text: 'User not found.' }, { quoted: msg });
                    return true;
                }
                
                // Get more info
                const userInfoRes = await axios.get(`https://users.roblox.com/v1/users/${user.id}`);
                const userInfo = userInfoRes.data;

                const text = `ROBLOX USER\n\nUsername: ${userInfo.name}\nDisplay Name: ${userInfo.displayName}\nUser ID: ${userInfo.id}\nCreated: ${new Date(userInfo.created).toLocaleDateString()}`;
                
                await sock.sendMessage(sender, { text }, { quoted: msg });
            } catch (err) {
                await sock.sendMessage(sender, { text: 'Failed to fetch user info.' }, { quoted: msg });
            }
            return true;
        default:
            return false;
    }
}
module.exports = { handleRobloxCommands };
