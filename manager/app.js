const express = require("express");
const connectDB = require("./connect-db");
const workQueueHelpers = require("./workqueue");
const inventoryHelpers = require("./inventory");
const WorkOrder = require("./models/WorkOrder");
const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Database connection at server start
connectDB();

// Establish connection to RabbitMQ broker.
workQueueHelpers.createWorkQueueConnection();

// ROUTES

app.get("/ping", (req, res) => {
    res.send("OK")
});

app.post("/order", async (req, res) => {
    // "tomato_pizza"
    // quantity.
    // order number
    const {pizza_name, quantity} = req.body;
    console.log(pizza_name, quantity);
    // Check if pizza can be made with current inventory stock
    if(!(await inventoryHelpers.checkIfPizzaCanBeMade(pizza_name, quantity))){
        res.status(201).json({
            result: "Failed, not enough stock;"
        });
    }
    // Create a new work order for this pizza and persist to DB
    const pizzaOrder = new WorkOrder({
        name: pizza_name,
        quantity: quantity,
        priority: 2,
        timeRequired: 100 * quantity,
        status: "CREATED"
    });
    await pizzaOrder.save();

    // Dispatch order for making the pizza
    await workQueueHelpers.produceTasks([pizzaOrder]);
    res.status(201).json({
        result: "Order success"
    });
});

app.get("/load", async(req, res) => {
    await inventoryHelpers.deleteExistingWorkOrders();
    let orders = await inventoryHelpers.seedDB();
    await inventoryHelpers.deleteExistingIngredients();
    let ingredients = await inventoryHelpers.saveIngredients();
    await workQueueHelpers.produceTasks(orders);
    res.send("OK")
});


// Setting up server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});