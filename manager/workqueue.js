const amqp = require("amqplib");
const WorkOrder = require("./models/WorkOrder");
const awsHelpers = require("./aws");
const STOCK_THRESHOLD = 12;
const RABBITMQ_QUEUE_NAME = "task_queue";
const RABBITMQ_AWS_URL = "amqp://test:password@";
const RABBITMQ_LOCAL_URL = "amqp://localhost:5672";

let connection, channel;

const dlxExchange = 'dlx';
const RABBITMQ_INSTANCE_NAME = "RabbitMQ";
const dlxRoutingKey = 'dlx_routing_key';

exports.createWorkQueueConnection = async () => {
	try {
        let rabbitmqInstancePublicAddress = await awsHelpers.getEc2InstancePublicIpAddressByName(RABBITMQ_INSTANCE_NAME);
		connection = await amqp.connect(RABBITMQ_AWS_URL + rabbitmqInstancePublicAddress);
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