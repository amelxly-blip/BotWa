require('dotenv').config();

function getPrefix() {
    return '.';
}

function isOwner(jid) {
    const ownerNumber = process.env.OWNER_NUMBER || '';
    const jidNumber = jid.split('@')[0];
    return ownerNumber === jidNumber;
}

function formatDuration(ms) {
    const days = Math.floor(ms / (24*60*60*1000));
    const daysms = ms % (24*60*60*1000);
    const hours = Math.floor(daysms / (60*60*1000));
    const hoursms = ms % (60*60*1000);
    const minutes = Math.floor(hoursms / (60*1000));
    return `${days}d ${hours}h ${minutes}m`;
}

module.exports = { getPrefix, isOwner, formatDuration };
