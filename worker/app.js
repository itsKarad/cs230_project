const express = require('express');
const app = express();

var amqp = require('amqplib/callback_api');
const FAILURE_PROBABILITY = 0.4;

// Define the DLX configuration
const mainQueue = 'task_queue';
const dlxExchange = 'dlx';
const dlxQueue = 'dlx_queue';
const dlxRoutingKey = 'dlx_routing_key';
const maxRetries = 3; // Maximum number of retries

//amqp://test:password@18.225.234.49
amqp.connect('amqp://localhost', function (error0, connection) {
	if (error0) {
		throw error0;
	}
	connection.createChannel(async function (error1, channel) {
		if (error1) {
			throw error1;
		}

		// Ensure the DLX exchange and queue exist
		channel.assertExchange(dlxExchange, 'direct', { durable: true });
		channel.assertQueue(dlxQueue, { durable: true });
		channel.bindQueue(dlxQueue, dlxExchange, dlxRoutingKey);

		// This makes sure the queue is declared before attempting to consume from it
		channel.assertQueue(mainQueue, {
			durable: true,
			arguments: {
				'x-dead-letter-exchange': dlxExchange,
				'x-dead-letter-routing-key': dlxRoutingKey,
			},
		});

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
			mainQueue,
			function (msg) {
				let task = JSON.parse(msg.content.toString());

				console.log(' [x] Received %s', task.name);

				// Simulate worker failure with 10% probability
				if (Math.random() < FAILURE_PROBABILITY) {
					console.log(' [-] Worker failed to process the task:', task.name);
					// Requeue the message
					// channel.reject(msg, true); // true to requeue
					channel.nack(msg, false, false);
					return;
				}

				setTimeout(function () {
					console.log(' [x] Done', task.name);
					channel.ack(msg);
				}, task.timeReqd * 1000);
			},
			{
				noAck: false,
			}
		);
	});
});

app.get('/ping', (req, res) => {
	res.send('OK');
});

// Setting server
const PORT = process.env.PORT || 8081;
app.listen(PORT, (req, res) => {
	console.log('Server is online on ' + PORT);
});
