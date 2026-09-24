# MCHLERN BOT

WhatsApp Group Management & Rental Bot

## Features
- QR Code Pairing via Web Dashboard
- Group Rentals (Add/Delete/Extend)
- Auto Leave when rent expires
- Chat Analytics & Total Chat
- Roblox API Tools
- Web Dashboard for Owner
- SQLite Persistence

## Termux Installation

```bash
pkg update && pkg upgrade
pkg install nodejs git ffmpeg -y
git clone <your-repo> mchlern-bot
cd mchlern-bot
npm install
cp .env.example .env
```
Edit `.env` and configure your `OWNER_NUMBER` (e.g. 62812345678).

Run:
```bash
npm start
```

## Web Dashboard
Open `http://localhost:3000` (or your device IP on port 3000) to scan the QR code and manage rentals.
