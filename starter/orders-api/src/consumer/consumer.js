// consumer.js

const amqp = require('amqplib');
const emailValidator = require('email-validator');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const mysql = require('mysql');

// Import your existing modules
const { sendEmail } = require('../api/emailSender');
const { sendWhatsApp } = require('../api/whatsappSender');
const { processPendingItems } = require('../api/emailSenderTransaction'); // Import for handling pending items

// Configuration (Replace with your actual values)
const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';
const queue = 'notification_queue';

const dbConfig = {
  host: 'localhost',
  user: 'root', // Add password if required
  database: 'berbagilink'
};

// Validate Email
function validateEmail(email) {
  return emailValidator.validate(email);
}

// Validate Phone Number
function isValidPhoneNumber(number) {
  try {
    const parsedNumber = phoneUtil.parse(number, 'ID'); // Assuming Indonesian number
    return phoneUtil.isValidNumber(parsedNumber);
  } catch (error) {
    return false;
  }
}

// Update Transaction Record (Refactored using async/await)
async function updateTransactionNotification(transactionId) {
  const connection = mysql.createConnection(dbConfig);
  
  try{
    await connection.connect();
    const updateQuery = 'UPDATE event_transactions SET is_notify_success = 1 WHERE id = ?';
    await connection.query(updateQuery, [transactionId]);
  }catch(err){
    console.error("Error updating transaction:", err);
    // handle the error appropriately
  }finally{
    connection.end();
  }
}

// Process Transaction Logic
async function processTransaction(transaction, tickets) {
  try {
    if (transaction.is_notify_success === null || transaction.is_notify_success === 0) {
      let sendEmailResult = null;
      let sendWAResult = null;
      let phone_number = transaction.handphone ? transaction.handphone : transaction.phone_number;

      // Email Validation and Sending
      if (validateEmail(transaction.email)) {
        try {
          sendEmailResult = await sendEmail(transaction, tickets);
          console.log(sendEmailResult);
        } catch (error) {
          console.error("Error sending email:", error);
        }
      }

      // Phone Number Validation and WhatsApp Sending
      if (isValidPhoneNumber(phone_number)) {
        try {
          sendWAResult = await sendWhatsApp(transaction, tickets);
          console.log(sendWAResult);
        } catch (error) {
          console.error("Error sending WhatsApp message:", error);
        }
      }

      // Update Transaction Status
      if (sendEmailResult === 'Email sent' && sendWAResult === 'Message sent') {
        transaction.is_notify_success = 1;
        await transaction.save(); // Assuming you have a way to save the transaction model
      }
    }
  } catch (error) {
    console.error("Error processing transaction:", error);
    console.log(transaction);
    // Consider re-queuing the message with a delay or logging for manual intervention.
  }
}

// Main Consumer Logic
async function consumeMessages() {
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
              // ... (Process transactions as before)
              await processTransaction(transaction, tickets);
  
              // Update Notification Success (if needed)
              await updateTransactionNotification(transaction.id); 
  
              await processPendingItems(); // Process pending items AFTER main transaction
              channel.ack(msg);
            }
          } catch (error) {
            console.error('Error processing message', error);
            // Consider re-queuing the message with a delay or logging for manual intervention
          }
        }
      });
    } catch (error) {
      console.error('Failed to start consumer', error);
    }
  }
  
  consumeMessages();
