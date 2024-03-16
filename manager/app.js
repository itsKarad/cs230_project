const express = require('express');
const connectDB = require('./connect-db');
const workQueueHelpers = require('./workqueue');
const inventoryHelpers = require('./inventory');
const databaseHelper = require('./modify_database');
const app = express();
const amqp = require('amqplib/callback_api');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection at server start
connectDB();

// ROUTES

app.get('/ping', (req, res) => {
	res.send('OK');
});

app.post('/order', async (req, res) => {
	// "tomato_pizza"
	// quantity.
	// order number
	const { pizza_name, quantity } = req.body;
	console.log(pizza_name, quantity);
	if (!(await inventoryHelpers.checkIfPizzaCanBeMade(pizza_name, quantity))) {
		res.status(201).json({
			result: 'Failed, not enough stock;',
		});
	}
	res.status(201).json({
		result: 'Order success',
	});
});

const clearQueues = () => {
	amqp.connect('amqp://localhost', function (error0, connection) {
		if (error0) {
			throw error0;
		}

		connection.createChannel(async function (error1, channel) {
			if (error1) {
				throw error1;
			}

			try {
				// Get a list of all queues
				const result = await channel.assertQueue('', { exclusive: true });
				// console.log(result);
				const queueNames = result.queue;
				// console.log('-------------------');
				console.log(queueNames);

				// Delete each queue
				for (const queueName of queueNames) {
					await channel.deleteQueue(queueName);
					console.log(`Queue '${queueName}' deleted.`);
				}

				// Close the channel and connection
				await channel.close();
				await connection.close();
			} catch (error2) {
				console.error('Error clearing queues:', error2);
			}
		});
	});
};

app.get('/load', async (req, res) => {
	// Clear all queues
	// clearQueues();

	await inventoryHelpers.deleteExistingWorkOrders();
	let orders = await inventoryHelpers.seedDB();
	await inventoryHelpers.deleteExistingIngredients();

	// empty lock collection
	await databaseHelper.emptyLockCollection();

	let ingredients = await inventoryHelpers.saveIngredients();
	await workQueueHelpers.produceTasks(orders);
	res.send('OK');
});

// Setting up server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
	console.log('Server is online on ' + PORT);
	// clearQueues();
});
