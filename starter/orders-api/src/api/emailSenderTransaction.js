require('dotenv').config();
const nodemailer = require('nodemailer');
const mysql = require('mysql');

// Database connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    database: 'berbagilink'
};

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

const ejs = require('ejs');
const path = require('path');

const buildCustomEmailTemplate = (messageObj) => {
    const templatePath = path.join(__dirname, 'views', 'transaction.ejs');
    return ejs.renderFile(templatePath, { messageObj });
};

const sendEmail = (messageObj) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: messageObj.email,
            subject: messageObj.title,
            html: buildCustomEmailTemplate(messageObj)
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return reject(error.toString());
            }
            resolve('Custom email sent');
        });
    });
};

const getTransaction = (transactionId) => {
    const connection = mysql.createConnection(dbConfig);
    connection.connect();

    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM event_transaction WHERE id = ?';
        connection.query(query, [transactionId], (err, results) => {
            connection.end();
            if (err) {
                return reject(err.toString());
            }
            resolve(results[0]);
        });
    });
};

const getMessage = (messageId) => {
    const connection = mysql.createConnection(dbConfig);
    connection.connect();

    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM event_trans_manual_message WHERE id = ?';
        connection.query(query, [messageId], (err, results) => {
            connection.end();
            if (err) {
                return reject(err.toString());
            }
            resolve(results[0]);
        });
    });
};

const updateItemStatus = (transactionId, messageId) => {
    const connection = mysql.createConnection(dbConfig);
    connection.connect();

    return new Promise((resolve, reject) => {
        const updateQuery = 'UPDATE event_trans_manual_message_per_ids SET time_sent = NOW(), message_has_been_sent = 1 WHERE event_trans_manual_message_id = ? AND event_transaction_id = ?';
        connection.query(updateQuery, [messageId, transactionId], (err, result) => {
            connection.end();
            if (err) {
                return reject(err.toString());
            }
            resolve('Item status updated');
        });
    });
};

const processPendingItems = async () => {
    try {
        // Replace this with your logic to fetch pending items
        // const items = await getPendingItems();
        for (const item of items) {
            try {
                const transaction = await getTransaction(item.event_transaction_id);
                const message = await getMessage(item.event_trans_manual_message_id);

                if (transaction && message) {
                    const emailResult = await sendEmail({
                        email: transaction.email,
                        title: message.title,
                        image_url: message.image_url,
                        message_info: message.message_info
                    });
                    console.log(emailResult);

                    await updateItemStatus(item.event_transaction_id, item.event_trans_manual_message_id);
                }
            } catch (error) {
                console.error('Error processing item', error);
            }
        }
    } catch (error) {
        console.error('Error retrieving pending items', error);
    }
};

module.exports = { processPendingItems };