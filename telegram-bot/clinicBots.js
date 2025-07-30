const TelegramBot = require('node-telegram-bot-api');
const pool = require('./db');

const bots = {};

async function loadClinicBots() {
  const { rows } = await pool.query('SELECT id, telegram_bot_token FROM clinics WHERE telegram_bot_token IS NOT NULL');
  rows.forEach(row => {
    if (!bots[row.id]) {
      bots[row.id] = new TelegramBot(row.telegram_bot_token, { polling: true });
      // You can add event handlers here for each bot if needed
              // Loaded bot for clinic
    }
  });
}

async function sendMessageToPatient(clinicId, chatId, message) {
  if (bots[clinicId]) {
    await bots[clinicId].sendMessage(chatId, message);
  } else {
    throw new Error('No bot found for this clinic');
  }
}

module.exports = { bots, loadClinicBots, sendMessageToPatient };