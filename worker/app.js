const express = require("express");
const app = express();

var amqp = require('amqplib/callback_api');
const RABBITMQ_QUEUE_NAME = "task_queue";
const RABBITMQ_AWS_URL = "amqp://test:password@18.225.234.49";
const RABBITMQ_LOCAL_URL = "amqp://localhost:5672";
const FAILURE_PROBABILITY = 0.5;

amqp.connect(RABBITMQ_LOCAL_URL, function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        var queue = RABBITMQ_QUEUE_NAME;

        // This makes sure the queue is declared before attempting to consume from it
        channel.assertQueue(queue, {
            durable: true
        });

        channel.prefetch(1);

        channel.consume(queue, function(msg) {
        let task = JSON.parse(msg.content.toString())

        console.log(" [x] Received %s",task.name);

        // Simulate worker failure with 10% probability
        if (Math.random() < FAILURE_PROBABILITY) {
            console.log(" [x] Worker failed to process the task:", task.name);
            // Requeue the message
            channel.reject(msg, true); // true to requeue
            return;
        }

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
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});