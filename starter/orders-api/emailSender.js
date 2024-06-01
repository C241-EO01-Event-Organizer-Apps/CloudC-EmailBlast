require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
app.use(bodyParser.json());

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
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

const buildEmailTemplate = (transaction, tickets) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; color: #4A5568; }
            .content { font-style: italic; font-weight: 500; font-size: 1rem; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .table th { background-color: #f2f2f2; }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="content">Hai, ${transaction.nama}</div>
        <p>Terima kasih, anda sudah memesan tiket <b>${transaction.event.nama_event}</b></p>

        <p>Silakan segera melakukan pembayaran di link berikut:</p>
        <a target="_blank" href="https://berbagi.link/${transaction.user.username}/event/checkout-detail/${transaction.id}/${transaction.token}">Cara Pembayaran</a>

        <p>Setelah itu, silakan konfirmasikan pembayaran yang telah Anda lakukan di link berikut:</p>
        <a target="_blank" href="https://berbagi.link/${transaction.user.username}/event/konfirmasi-pembayaran/${transaction.id}/${transaction.token}">Konfirmasi Pembayaran</a>

        <h2>Detail Pemesanan:</h2>
        <table class="table">
            <tr>
                <td>No. Invoice</td>
                <td>:</td>
                <td>#${transaction.invoice}</td>
            </tr>
            <tr>
                <td>Nama Event</td>
                <td>:</td>
                <td>${transaction.event.nama_event}</td>
            </tr>
            <tr>
                <td>Tanggal Mulai</td>
                <td>:</td>
                <td>${transaction.event.tanggal_start}</td>
            </tr>
            <tr>
                <td>Tanggal Berakhir</td>
                <td>:</td>
                <td>${transaction.event.tanggal_end}</td>
            </tr>
            <tr>
                <td>Nama Organizer</td>
                <td>:</td>
                <td>${transaction.event.nama_organizer}</td>
            </tr>
            <tr>
                <td>Total Harga Tiket</td>
                <td>:</td>
                <td>${transaction.total_harga_tiket}</td>
            </tr>
            <tr>
                <td>Status Pembayaran</td>
                <td>:</td>
                <td>${transaction.status_pembayaran}</td>
            </tr>
        </table>

        <h2>Tickets</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Booking Code</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${tickets.map(ticket => `
                <tr>
                    <td>${ticket.booking_code}</td>
                    <td>${ticket.status}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <p>Total: ${transaction.total}</p>
        <p>Regards,<br>BerbagiLink Team</p>
    </body>
    </html>
    `;
};

const sendEmail = (transaction, tickets) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: transaction.email,
            subject: `Invoice #${transaction.invoice}`,
            html: buildEmailTemplate(transaction, tickets)
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                return reject(error.toString());
            }

            const connection = mysql.createConnection(db);
            connection.connect();

            const updateQuery = `UPDATE transaction SET is_notify_invoice = 1 WHERE id = ?`;
            connection.query(updateQuery, [transaction.id], (err, result) => {
                connection.end();
                if (err) {
                    return reject(err.toString());
                }
                resolve('Invoice sent and updated');
            });
        });
    });
};

module.exports = { sendEmail };