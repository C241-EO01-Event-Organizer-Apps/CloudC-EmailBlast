require('dotenv').config();
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const util = require('util'); 

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
    logger: true,
    debug: true,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    },
    tls:{
        rejectUnauthorized: true
    }
});

const ejs = require('ejs');
const path = require('path');
// Ambil lokasi direktori saat ini
const dir = path.resolve();
// Bernavigasi ke direktori induk (parent directory)
const parentDirectory = path.join(dir, '..');

const buildCustomEmailTemplate = (messageObj) => {
    const templatePath = path.join(parentDirectory, 'views', 'transaction.ejs');
    return ejs.renderFile(templatePath, { messageObj });
};

async function getPendingItems() {
    const connection = mysql.createConnection(dbConfig);
  
    try {
      await connection.connect();
      const query = 'SELECT * FROM event_trans_manual_message_per_ids WHERE message_has_been_sent = 0'; 
  
      // Convert query to a promise using util.promisify
      const queryAsync = util.promisify(connection.query).bind(connection); // Make it a promise
  
      // Execute the query
      const rows = await queryAsync(query); 
  
      // Additional checks and logging for debugging
      if (!Array.isArray(rows)) {
        console.error('Unexpected result from the database. Rows is:', rows);
        return []; // Or throw an error if you want to fail explicitly
      } else {
        return rows;
      }
    } catch (error) {
      console.error('Error retrieving pending items:', error);
      return [];
    } finally {
      connection.end();
    }
  }
  
  

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
        const query = 'SELECT * FROM event_transactions WHERE id = ?';
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

// Process Pending Items (Refactored)
const processPendingItems = async () => {
    try {
      const items = await getPendingItems();
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
          console.error('Error processing item:', error);
          // Handle the error appropriately (e.g., logging, notifying admin)
        }
      }
    } catch (error) {
      console.error('Error retrieving pending items:', error);
      // Handle the error (e.g., logging, retrying later)
    }
  };
  
  module.exports = { processPendingItems };