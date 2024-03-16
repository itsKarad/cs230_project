const amqp = require("amqplib");
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
const RABBITMQ_QUEUE_NAME = "task_queue";
const RABBITMQ_AWS_URL = "amqp://test:password@18.225.234.49";
const RABBITMQ_LOCAL_URL = "amqp://localhost:5672";

exports.produceTasks = async(orders) => {
    try{
        const connection = await amqp.connect(RABBITMQ_LOCAL_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(RABBITMQ_QUEUE_NAME, {
            durable: true
        });
        for(const order of orders){
            channel.sendToQueue(RABBITMQ_QUEUE_NAME, Buffer.from(JSON.stringify(order)), {
                persistent: true
            });
        }
    }
    catch(err){
        console.log(err);
    }
}