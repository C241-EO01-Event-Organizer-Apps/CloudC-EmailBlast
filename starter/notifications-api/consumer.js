const amqp = require('amqplib');
const { sendEmail } = require('./emailSender');
const { sendWhatsApp } = require('./whatsappSender');


const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const queue = 'notification_queue';

const consumeMessages = async () => {
    try {
        const conn = await amqp.connect(amqpUrl);
        const channel = await conn.createChannel();
        await channel.assertQueue(queue);

        console.log(`Waiting for messages in ${queue}`);
        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                const { type, transaction, tickets } = data;

                try {
                    if (type === 'email') {
                        await sendEmail(transaction, tickets);
                    } else if (type === 'whatsapp') {
                        await sendWhatsApp(transaction, tickets);
                    }
                    channel.ack(msg);
                } catch (error) {
                    console.error('Error processing message', error);
                }
            }
        });
    } catch (error) {
        console.error('Failed to start consumer', error);
    }
};

consumeMessages();
