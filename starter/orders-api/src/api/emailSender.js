require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const ejs = require('ejs');
const path = require('path');

const app = express();
app.use(bodyParser.json());


// Ambil lokasi direktori saat ini
const dir = path.resolve();
// Bernavigasi ke direktori induk (parent directory)
const parentDirectory = path.join(dir, '..');
// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'berbagilink'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected...');
});

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

const buildEmailTemplate = (transaction, tickets) => {
    const qrCodeAvailable = transaction.payment_method?.qr_code;
    const invoiceTemplate = path.join(parentDirectory, 'views', 'tagihan.ejs');

    return ejs.renderFile(invoiceTemplate, { transaction, tickets, qrCodeAvailable }, (err, data) => {
        if (err) {
            console.error('Error rendering EJS template:', err);
            return '';
        }
        return data;
    });
};

const sendEmail = (transaction, tickets) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: transaction.user.email,
            subject: `Invoice #${transaction.invoice}`,
            html: buildEmailTemplate(transaction, tickets)
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                return reject(error.toString());
            }
            resolve('Email sent');
        });
    });
};

module.exports = { sendEmail: sendEmail }