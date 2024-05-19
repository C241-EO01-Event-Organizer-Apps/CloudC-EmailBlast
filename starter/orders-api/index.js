require('dotenv').config();
const express = require('express');
const amqp = require('amqplib');
const nodemailer = require('nodemailer');

const app = express();
const amqpUrl = 'amqp://localhost:5672';

// Konfigurasi nodemailer dengan Mailgun SMTP
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

const emailData = {
    from: process.env.MAIL_FROM_ADDRESS,
    to: 'bagaslord04@gmail.com',
    subject: 'Test Email Subject',
    text: 'Example Plain Text Message Body'
};

app.get('/', async (req, res) => {
    try {
        const connection = await amqp.connect(amqpUrl); // Memeriksa koneksi ke RabbitMQ
        const channel = await connection.createChannel();
        await channel.assertQueue("order.shipped");
        channel.sendToQueue("order.shipped", Buffer.from(JSON.stringify(emailData)));

        // Menutup koneksi setelah mengirim pesan
        // setTimeout(() => {
        //     connection.close();
        // }, 500);
        
        // Mengirim email menggunakan nodemailer
        transporter.sendMail(emailData, (error, info) => {
            if (error) {
                console.log('Error occurred:', error.message);
                res.status(500).send('Failed to send email');
                return;
            }
            console.log('Message sent: %s', info.messageId);
            res.send('Email sent successfully');
        });
        
    } catch (error) {
        console.log(error); // Penanganan error yang lebih baik diperlukan
        res.status(500).send('Failed to connect to RabbitMQ');
    }
});

app.listen(8000, () => {
    console.log("EMAILSEND API listening on port 8000");
});
