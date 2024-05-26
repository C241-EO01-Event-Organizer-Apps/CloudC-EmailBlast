const express = require('express');
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const queue = 'message_queue';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false, // true untuk port 465, false untuk port lainnya
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

app.post('/send', async (req, res) => {
  const { number, email, subject, message } = req.body;

  if (!number || !email || !subject || !message) {
    return res.status(400).send('Number, email, subject, and message are required');
  }

  try {
    const conn = await amqp.connect(amqpUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue(queue);

    const msg = { number, email, subject, message };
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));

    console.log(`Message sent to queue: ${JSON.stringify(msg)}`);
    res.status(200).send('Message sent to queue');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to send message');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
