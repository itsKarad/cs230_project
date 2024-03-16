const amqp = require('amqplib/callback_api');
const STOCK_THRESHOLD = 12;

function getSauceStock() {
	// Assuming a simple variable for sauce stock, replace with your actual logic
	return 5;
}

// Mock function to get dough stock
function getDoughStock() {
	// Assuming a simple variable for dough stock, replace with your actual logic
	return 5;
}

// Define the DLX configuration
const mainQueue = 'task_queue';
const dlxExchange = 'dlx';
const dlxQueue = 'dlx_queue';
const dlxRoutingKey = 'dlx_routing_key';

exports.produceTasks = async (orders) => {
	//amqp://test:password@18.225.234.49
	amqp.connect('amqp://localhost', function (error0, connection) {
		if (error0) {
			throw error0;
		}
		connection.createChannel(function (error1, channel) {
			if (error1) {
				throw error1;
			}

			var msg = process.argv.slice(2).join(' ') || 'Hello World!';

			// Ensure the DLX exchange and queue exist
			channel.assertExchange(dlxExchange, 'direct', { durable: true });
			channel.assertQueue(dlxQueue, { durable: true });
			channel.bindQueue(dlxQueue, dlxExchange, dlxRoutingKey);

			channel.assertQueue(mainQueue, {
				durable: true,
				arguments: {
					'x-dead-letter-exchange': 'dlx',
					'x-dead-letter-routing-key': 'dlx_routing_key',
				},
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
				channel.sendToQueue(mainQueue, Buffer.from(JSON.stringify(order)), {
					persistent: true,
				});
			}

			console.log(" [x] Sent '%s'", msg);
		});
		setTimeout(function () {
			connection.close();
			// process.exit(0); Commented before server shuts down.
		}, 500);
	});
};
