require('dotenv').config();
const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const queue = 'notification_queue';

app.post('/send-notification', async (req, res) => {
    const { type, transaction, tickets } = req.body;

    if (!type || !transaction || !tickets) {
        return res.status(400).send('Type, transaction, and tickets are required');
    }

    if (type !== 'email' && type !== 'whatsapp') {
        return res.status(400).send('Type must be either email or whatsapp');
    }

    try {
        const conn = await amqp.connect(amqpUrl);
        const channel = await conn.createChannel();
        await channel.assertQueue(queue);

        const msg = { type, transaction, tickets };
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));

        res.status(200).send('Notification request sent to queue');
    } catch (err) {
        res.status(500).send('Failed to send message to queue');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
