const express = require("express");
const app = express();

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        var queue = 'task_queue';

        // This makes sure the queue is declared before attempting to consume from it
        channel.assertQueue(queue, {
            durable: true
        });

        channel.prefetch(1);

        channel.consume(queue, function(msg) {
        let task = JSON.parse(msg.content.toString())

        console.log(" [x] Received %s",task.name);
        setTimeout(function() {
            console.log(" [x] Done");
            channel.ack(msg);
        }, task.timeReqd * 1000);
        }, {
        // automatic acknowledgment mode,
        // see ../confirms.html for details
            noAck: false
        });
    });
});

app.get("/ping", (req, res) => {
    res.send("OK")
});



// Setting server
const PORT = process.env.PORT || 8081;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});