require('dotenv').config();
const { initDb } = require('./database/db');
const { connectToWhatsApp } = require('./bot/connection');
const { startScheduler } = require('./scheduler/rentalScheduler');
const { startServer } = require('./web/server');

async function start() {
    console.log('Initializing Database...');
    initDb();
    
    console.log('Connecting to WhatsApp...');
    await connectToWhatsApp();
    
    console.log('Starting Scheduler...');
    startScheduler();
    
    console.log('Starting Web Dashboard...');
    startServer();
}

start();
