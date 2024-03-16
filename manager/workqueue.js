const amqp = require('amqplib');
const WorkOrder = require('./models/WorkOrder');
const STOCK_THRESHOLD = 12;

const RABBITMQ_QUEUE_NAME = 'task_queue';
const RABBITMQ_AWS_URL = 'amqp://test:password@18.225.234.49';
const RABBITMQ_LOCAL_URL = 'amqp://localhost:5672';

// Define the DLX configuration
const dlxExchange = 'dlx';
const dlxRoutingKey = 'dlx_routing_key';

let connection, channel;

exports.createWorkQueueConnection = async () => {
	try {
		connection = await amqp.connect(RABBITMQ_LOCAL_URL);
		channel = await connection.createChannel();
		channel.assertQueue(RABBITMQ_QUEUE_NAME, {
			durable: true,
			arguments: {
				'x-dead-letter-exchange': dlxExchange,
				'x-dead-letter-routing-key': dlxRoutingKey,
			},
		});
		console.log('Connected to RabbitMQ broker!');
	} catch (err) {
		console.log('RabbitMQ broker connection failed!');
		console.log(err);
	}
};

exports.produceTasks = async (orders) => {
	amqp.connect(
		'amqp://test:password@18.225.234.49',
		function (error0, connection) {
			if (error0) {
				throw error0;
			}
			connection.createChannel(function (error1, channel) {
				if (error1) {
					throw error1;
				}

				var queue = 'task_queue';
				var msg = process.argv.slice(2).join(' ') || 'Hello World!';

				channel.assertQueue(queue, {
					durable: true,
				});

				const sauceStock = getSauceStock();
				const doughStock = getDoughStock();

				// if (sauceStock < STOCK_THRESHOLD || doughStock < STOCK_THRESHOLD) {
				//     // Add extra dough and sauces to work order
				//     // Added low priority 5 for these tasks
				//     if (sauceStock < STOCK_THRESHOLD) {
				//         const extraSauceQtn = STOCK_THRESHOLD - sauceStock;
				//         orders.push(createWorkOrder("Prepare Sauce", extraSauceQtn, 5, 5));
				//         console.log(`Added ${extraSauceQtn} extra sauces to the work order.`);
				//     }
				//     if (doughStock < STOCK_THRESHOLD) {
				//         const extraDoughQtn = STOCK_THRESHOLD - doughStock;
				//         orders.push(createWorkOrder("Prepare Dough", extraDoughQtn, 5, 5));
				//         console.log(`Added ${extraDoughQtn} extra dough to the work order.`);
				//     }
				//
				// }
				for (const order of orders) {
					channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
						persistent: true,
					});
				}

				console.log(" [x] Sent '%s'", msg);
			});
			setTimeout(function () {
				connection.close();
				// process.exit(0); Commented before server shuts down.
			}, 500);
		}
	);
};
