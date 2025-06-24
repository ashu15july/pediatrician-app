const express = require('express');
const { loadClinicBots, bots, sendMessageToPatient } = require('./clinicBots');
const pool = require('./db');

const app = express();
app.use(express.json());

async function start() {
  await loadClinicBots();

  // Set up /start handler for each bot
  Object.entries(bots).forEach(([clinicId, bot]) => {
    bot.onText(/\/start (.+)/, async (msg, match) => {
      const patientId = match[1];
      const chatId = msg.chat.id;
      // Link this chatId to the patient in the DB
      await pool.query(
        'UPDATE patients SET telegram_chat_id = $1 WHERE id = $2 AND clinic_id = $3',
        [chatId, patientId, clinicId]
      );
      bot.sendMessage(chatId, '✅ You are now connected to your clinic for updates!');
    });
  });

  // API endpoint to send a message to a patient
  app.post('/send-message', async (req, res) => {
    const { clinicId, patientId, message } = req.body;
    if (!clinicId || !patientId || !message) {
      return res.status(400).json({ error: 'clinicId, patientId, and message are required' });
    }
    // Get the patient's telegram_chat_id
    const { rows } = await pool.query(
      'SELECT telegram_chat_id FROM patients WHERE id = $1 AND clinic_id = $2',
      [patientId, clinicId]
    );
    if (!rows[0] || !rows[0].telegram_chat_id) {
      return res.status(404).json({ error: 'Patient not linked to Telegram' });
    }
    try {
      await sendMessageToPatient(clinicId, rows[0].telegram_chat_id, message);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Telegram bot server listening on port ${PORT}`);
  });
}

start();