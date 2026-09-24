const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Lokal: ./storage | Railway: /data (sesuai Volume mount path)
const BASE_STORAGE = process.env.STORAGE_PATH || path.join(__dirname, '..', '..', 'storage');
const dbDir = path.join(BASE_STORAGE, 'database');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mchlern.sqlite');
const db = new sqlite3.Database(dbPath);

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT,
            premium BOOLEAN DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT,
            welcome_status BOOLEAN DEFAULT 0,
            goodbye_status BOOLEAN DEFAULT 0,
            antilink_status BOOLEAN DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT,
            group_name TEXT,
            invite_link TEXT,
            customer_number TEXT,
            start_date INTEGER,
            expire_date INTEGER,
            status TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS chat_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT,
            user_id TEXT,
            message_count INTEGER DEFAULT 0,
            last_chat INTEGER
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT,
            user_id TEXT,
            warning_count INTEGER DEFAULT 0
        )`);
    });
}

module.exports = { db, initDb };
