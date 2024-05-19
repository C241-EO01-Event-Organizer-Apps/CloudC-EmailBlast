const express = require("express");
const amqp = require('amqplib');
const app = express();

const amqpUrl = 'amqp://localhost:5672';

app.get("/", (req, res) => {
  res.send("NOTIFCATIONS API")
})

async function connect() {
  try {
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue("order.shipped");
    channel.consume("order.shipped", (message) => {
      console.log("RECEIVED MESSAGE FROM QUEUE");
      console.log(message.content.toString())
      channel.ack(message) //biar ga ketumpuk di queue (langsung keapus)
    });
  } catch (error) {
    console.log(error);
  }
}

connect();

app.listen(8001, () => {
  console.log("Listening on PORT 8001");
});