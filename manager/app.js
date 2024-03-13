const express = require("express");
const connectDB = require("./connect-db");
const seedMethods = require("./seed-data");
const pizzas = require("./dependency");

const app = express();
// let orders = [
//     {
//         id: "1",
//         name: "Prepare Sauce",
//         priority: 3,
//         timeReqd: 5
//     },
//     {
//         id: "2",
//         name: "Prepare Toppings",
//         priority: 2,
//         timeReqd: 5
//     },
//     {
//         id: "3",
//         name: "Bake Pizza",
//         priority: 1,
//         timeReqd: 10
//     },
//     {
//         id: "4",
//         name: "Pack Pizza for delivery",
//         priority: 5,
//         timeReqd: 1
//     },
//     {
//         id: "5",
//         name: "Cut veggies for toppings",
//         priority: 3,
//         timeReqd: 3
//     }
// ];
var amqp = require('amqplib/callback_api');
const Ingredient = require("./Ingredient");
const STOCK_THRESHOLD = 12;
connectDB();
// Middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));

function getSauceStock() {
    // Assuming a simple variable for sauce stock, replace with your actual logic
    return 5;
}

// Mock function to get dough stock
function getDoughStock() {
    // Assuming a simple variable for dough stock, replace with your actual logic
    return 5;
}
const produceTasks = async(orders) => {
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
            for(const order of orders){
                channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
                    persistent: true
                });
            }
            

            console.log(" [x] Sent '%s'", msg);
        });
        setTimeout(function() {
            connection.close();
            // process.exit(0); Commented before server shuts down.
        }, 500);
    });
}

app.get("/ping", (req, res) => {
    res.send("OK")
});

checkIfPresentInInventory = async (ing_name, quantity) => {
    let ingredient;
    console.log("Searching for "+ing_name);
    ingredient = await Ingredient.findOne({name: ing_name});
    return (ingredient.quantity >= quantity);
}

checkIfPizzaCanBeMade = async (pizza_name, quantity) => {
    let pizzaIngredients = pizzas[pizza_name];
    console.log(pizzaIngredients);
    if(pizzaIngredients == null){
        return false;
    }
    for(let i in pizzaIngredients){
        if(!(await checkIfPresentInInventory(pizzaIngredients[i], quantity))){
            // reduce qty => ADD row LOCK for each ingredient.
            return false;
        }
    }
    return true;
}

app.post("/order", async (req, res) => {
    // "tomato_pizza"
    // quantity.
    // order number
    const {pizza_name, quantity} = req.body;
    console.log(pizza_name, quantity);
    if(!(await checkIfPizzaCanBeMade(pizza_name, quantity))){
        res.status(201).json({
            result: "Failed, not enough stock;"
        });
    }
    res.status(201).json({
        result: "Order success"
    });
});

app.get("/load", async(req, res) => {
    seedMethods.deleteExistingWorkOrders();
    let orders = await seedMethods.seedDB();
    seedMethods.deleteExistingIngredients();
    let ingredients = await seedMethods.saveIngredients();
    await produceTasks(orders);
    res.send("OK")
});


// Setting server
const PORT = process.env.PORT || 8082;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});