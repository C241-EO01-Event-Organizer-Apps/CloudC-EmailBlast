const amqp = require('amqplib');
const { sendEmail } = require('./emailSender');
const { sendWhatsApp } = require('./whatsappSender');
const { processPendingItems } = require('./emailSenderTransaction');
const mysql = require('mysql');

const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const queue = 'notification_queue';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    database: 'berbagilink'
};

const updateTransactionNotification = async (transactionId) => {
    const connection = mysql.createConnection(dbConfig);
    connection.connect();

    return new Promise((resolve, reject) => {
        const updateQuery = 'UPDATE transaction SET is_notify_invoice = 1 WHERE id = ?';
        connection.query(updateQuery, [transactionId], (err, result) => {
            connection.end();
            if (err) {
                return reject(err.toString());
            }
            resolve('Transaction updated');
        });
    });
};

const consumeMessages = async () => {
    try {
        const conn = await amqp.connect(amqpUrl);
        const channel = await conn.createChannel();
        await channel.assertQueue(queue);

        console.log(`Waiting for messages in ${queue}`);
        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                const { transaction, tickets } = data;

                try {
                    if (transaction && tickets) {
                        const emailResult = await sendEmail(transaction, tickets);
                        console.log(emailResult);
                        const whatsappResult = await sendWhatsApp(transaction, tickets);
                        console.log(whatsappResult);

                        await updateTransactionNotification(transaction.id);
                        await processPendingItems(); // Process the pending items after handling the message
                        channel.ack(msg);
                    }
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
