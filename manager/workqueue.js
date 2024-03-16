const amqp = require("amqplib");
const WorkOrder = require("./models/WorkOrder");
const STOCK_THRESHOLD = 12;
const RABBITMQ_QUEUE_NAME = "task_queue";
const RABBITMQ_AWS_URL = "amqp://test:password@18.225.234.49";
const RABBITMQ_LOCAL_URL = "amqp://localhost:5672";

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

exports.produceTasks = async(orders) => {
    try{

        for(const order of orders){
            // Change status to QUEUED
            let dbOrder = await WorkOrder.findById(order._id);
            if(!dbOrder){
                return;
            }
            dbOrder.status = "QUEUED";
            await dbOrder.save();
            channel.sendToQueue(RABBITMQ_QUEUE_NAME, Buffer.from(JSON.stringify(order)), {
                persistent: true
            });
        }
    }
    catch(err){
        console.log(err);
    }
}