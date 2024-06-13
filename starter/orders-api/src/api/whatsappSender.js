const axios = require('axios');
const mysql = require('mysql');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    database: 'berbagilink'
};

const instanceId = process.env.INSTANCE_ID || '665B03255F41D';
const accessToken = process.env.ACCESS_TOKEN || '665b02e03139b';

// const buildWhatsAppMessage = (transaction, tickets) => {
//     return `
// Hai, ${transaction.nama}

// Terima kasih, Anda sudah memesan tiket *${transaction.event.nama_event}*

// Silakan segera melakukan pembayaran di link berikut:
// https://berbagi.link/${transaction.user.username}/event/checkout-detail/${transaction.id}/${transaction.token}

// Setelah itu, silakan konfirmasikan pembayaran yang telah Anda lakukan di link berikut:
// https://berbagi.link/${transaction.user.username}/event/konfirmasi-pembayaran/${transaction.id}/${transaction.token}

// *Detail Pemesanan:*
// - No. Invoice: #${transaction.invoice}
// - Nama Event: ${transaction.event.nama_event}
// - Tanggal Mulai: ${transaction.event.tanggal_start}
// - Tanggal Berakhir: ${transaction.event.tanggal_end}
// - Nama Organizer: ${transaction.event.nama_organizer}
// - Total Harga Tiket: ${transaction.total_harga_tiket}
// - Status Pembayaran: ${transaction.status_pembayaran}

// *Tickets:*
// ${tickets.map(ticket => `
// - Booking Code: ${ticket.booking_code}
//   Status: ${ticket.status}
// `).join('')}

// Total: ${transaction.total}

// Regards,
// BerbagiLink Team
//     `;
// };

const sendWhatsApp = async (transaction, tickets) => {
    const number = transaction.phone_number; // Pastikan nomor telepon ada di object transaction
    const message = buildWhatsAppMessage(transaction, tickets);

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
        return 'Message sent';
    } catch (err) {
        throw new Error(`Failed to send message: ${err}`);
    }
};

module.exports = { sendWhatsApp };
