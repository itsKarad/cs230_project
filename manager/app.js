const express = require("express");
const app = express();
let orders = [
    {
        id: "1",
        name: "Prepare Sauce",
        priority: 3,
        timeReqd: 5
    },
    {
        id: "2",
        name: "Prepare Toppings",
        priority: 2,
        timeReqd: 5
    },
    {
        id: "3",
        name: "Bake Pizza",
        priority: 1,
        timeReqd: 10
    },
    {
        id: "4",
        name: "Pack Pizza for delivery",
        priority: 5,
        timeReqd: 1
    },
    {
        id: "5",
        name: "Cut veggies for toppings",
        priority: 3,
        timeReqd: 3
    }
];
var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        var queue = 'task_queue';
        var msg = process.argv.slice(2).join(' ') || "Hello World!";

        channel.assertQueue(queue, {
            durable: true
        });
        for(const order of orders){
            channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
                persistent: true
            });
        }
        

        console.log(" [x] Sent '%s'", msg);
    });
    setTimeout(function() {
        connection.close();
        process.exit(0);
    }, 500);
});

app.get("/ping", (req, res) => {
    res.send("OK")
});



// Setting server
const PORT = process.env.PORT || 8082;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});