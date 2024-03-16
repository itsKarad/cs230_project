const express = require("express");
const app = express();
const connectDB = require("./connect-db");
const WorkOrder = require("./models/WorkOrder");

var amqp = require('amqplib');
const RABBITMQ_QUEUE_NAME = "task_queue";
const RABBITMQ_AWS_URL = "amqp://test:password@18.225.234.49";
const RABBITMQ_LOCAL_URL = "amqp://localhost:5672";
const FAILURE_PROBABILITY = 0.5;

// Connect to Database
connectDB();

// Connect to RabbitMQ broker
let connection, channel;
const connectToRabbitMQ = async() => {
    try{
        connection = await amqp.connect(RABBITMQ_LOCAL_URL);
        channel = await connection.createChannel();
        channel.assertQueue(RABBITMQ_QUEUE_NAME, {
            durable: true
        });
        console.log("Connected to RabbitMQ broker!");

        channel.prefetch(1);
        channel.consume(RABBITMQ_QUEUE_NAME, async(msg) => {
            let task = JSON.parse(msg.content.toString())

            console.log(" [x] Received %s",task.name);

            // Simulate worker failure with 10% probability
            if (Math.random() < FAILURE_PROBABILITY) {
                console.log(" [x] Worker failed to process the task:", task.name);
                // Requeue the message
                channel.reject(msg, true); // true to requeue
                return;
            }
            const workOrder = await WorkOrder.findById(task._id);
            workOrder.status = "EXECUTING";
            await workOrder.save();

            // update task status to EXECUTING
            console.log("Worker will require " + task.timeRequired + " seconds to complete task.");
            setTimeout(async() => {
                workOrder.status = "COMPLETED";
                await workOrder.save();
                console.log(" [x] Done");
                channel.ack(msg);
            }, task.timeRequired * 1000);
        }, {
            noAck: false
        });

    }
    catch(err){
        console.log(err);
    }
}

connectToRabbitMQ();

app.get("/ping", (req, res) => {
    res.send("OK")
});



// Setting server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});