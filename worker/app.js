const express = require("express");
const app = express();
const connectDB = require("./connect-db");
const WorkOrder = require("./models/WorkOrder");

var amqp = require('amqplib');
const RABBITMQ_QUEUE_NAME = "task_queue";
const RABBITMQ_AWS_URL = "amqp://test:password@18.224.57.156";
const RABBITMQ_LOCAL_URL = "amqp://localhost:5672";
const FAILURE_PROBABILITY = 0.1;

// Define the DLX configuration
const dlxExchange = 'dlx';
const dlxQueue = 'dlx_queue';
const dlxRoutingKey = 'dlx_routing_key';
const maxRetries = 3; // Maximum number of retries

// Connect to Database
connectDB();

// Connect to RabbitMQ broker
let connection, channel;
const connectToRabbitMQ = async () => {
	try {
		connection = await amqp.connect(RABBITMQ_AWS_URL);
		channel = await connection.createChannel();

		// Ensure the DLX exchange and queue exist
		channel.assertExchange(dlxExchange, 'direct', { durable: true });
		channel.assertQueue(dlxQueue, { durable: true });
		channel.bindQueue(dlxQueue, dlxExchange, dlxRoutingKey);

		channel.assertQueue(RABBITMQ_QUEUE_NAME, {
			durable: true,
			arguments: {
				'x-dead-letter-exchange': dlxExchange,
				'x-dead-letter-routing-key': dlxRoutingKey,
			},
		});
		console.log('Connected to RabbitMQ broker!');

		channel.prefetch(1);

		// Consume messages from the DLQ
		channel.consume(
			dlxQueue,
			async (msg) => {
				const retryCount =
					parseInt(msg.properties.headers['x-retry-count']) || 0;
				let task = JSON.parse(msg.content.toString());
				if (retryCount < maxRetries) {
					console.log(' [dlx] Received from DLX %s', task.name);

					// Simulate worker failure with 10% probability
					if (Math.random() < FAILURE_PROBABILITY) {
						console.log(' [dlx] Worker failed to process the task:', task.name);
						// Requeue the message
						channel.publish(dlxExchange, dlxRoutingKey, msg.content, {
							headers: {
								'x-retry-count': retryCount + 1,
							},
						});
						channel.nack(msg, false, false);
						return;
					}

					setTimeout(function () {
						console.log('[dlx] Done', task.name);
						channel.ack(msg);
					}, task.timeReqd * 1000);
				} else {
					console.log(' [x] Max retries reached for task:', task.name);
					channel.reject(msg, false); // false to discard
					//TODO: handle rejected message, increase quantity in inventory
				}
			},
			{
				noAck: false,
			}
		);

		channel.consume(
			RABBITMQ_QUEUE_NAME,
			async (msg) => {
				let task = JSON.parse(msg.content.toString());

				console.log(' [x] Received %s', task.name);

				// Simulate worker failure with 10% probability
				if (Math.random() < FAILURE_PROBABILITY) {
					console.log(' [x] Worker failed to process the task:', task.name);
					// Requeue the message
					channel.reject(msg, true); // true to requeue
					return;
				}
				const workOrder = await WorkOrder.findById(task._id);
				// Stale order not present in DB
				if (workOrder) {
					workOrder.status = 'EXECUTING';
					await workOrder.save();

					// update task status to EXECUTING
					console.log(
						'Worker will require ' +
							task.timeRequired +
							' seconds to complete task.'
					);
					setTimeout(async () => {
						workOrder.status = 'COMPLETED';
						await workOrder.save();
						console.log(' [x] Done');
						channel.ack(msg);
					}, task.timeRequired * 1000);
				} else {
					console.log('Discarding stale work order');
					channel.ack(msg);
				}
			},
			{
				noAck: false,
			}
		);
	} catch (err) {
		console.log(err);
	}
};

connectToRabbitMQ();

app.get("/ping", (req, res) => {
    res.send("OK")
});



// Setting server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});