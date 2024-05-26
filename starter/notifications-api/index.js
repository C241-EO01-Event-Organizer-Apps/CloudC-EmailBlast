const amqp = require('amqplib');
const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const queue = 'message_queue';

const instanceId = process.env.INSTANCE_ID || '665333B478C51';
const accessToken = process.env.ACCESS_TOKEN || '6653337a16fd3';

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

async function sendNotification(number, message) {
  const url = `https://x3.woonotif.com/api/send.php`;
  const params = {
    number,
    type: 'text',
    message,
    instance_id: instanceId,
    access_token: accessToken,
  };

  try {
    const response = await axios.get(url, { params });
    console.log(`Notification sent: ${response.data}`);
  } catch (err) {
    console.error(`Failed to send notification: ${err}`);
  }
}

async function sendEmail(email, subject, message) {
  const emailData = {
    from: process.env.MAIL_FROM_ADDRESS || 'no-reply@berbagi.link',
    to: email,
    subject: subject,
    text: message
  };

  try {
    const info = await transporter.sendMail(emailData);
    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error(`Failed to send email: ${error}`);
  }
}

async function receiveMessages() {
  try {
    const conn = await amqp.connect(amqpUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue(queue);

    console.log(`Waiting for messages in queue: ${queue}`);
    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        const { number, email, subject, message } = content;

        console.log(`Received message: ${JSON.stringify(content)}`);
        await sendNotification(number, message);
        await sendEmail(email, subject, message);

        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error(`Failed to receive messages: ${err}`);
  }
}

receiveMessages();
