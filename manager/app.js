const express = require("express");
const connectDB = require("./connect-db");
const workQueueHelpers = require("./workqueue");
const inventoryHelpers = require("./inventory");
const WorkOrder = require("./models/WorkOrder");
const app = express();
const cron = require("node-cron");
const awsHelpers = require("./aws");
const databaseHelper = require("./modify_database");
const RABBITMQ_INSTANCE_NAME = "RabbitMQ";

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
	// empty lock collection
	await databaseHelper.emptyLockCollection();

    let ingredients = await inventoryHelpers.saveIngredients();
    await workQueueHelpers.produceTasks(orders);
    res.send("OK")
});

const MAX_THRESHOLD_FOR_WAITING_TIME = 200;// 20 mins
cron.schedule('*/1 * * * *', async() => {
    console.log("Checking if another worker application should be spawned")
    // if total time of tasks which are in QUEUED state is more than 15 minutes, let's spawn up a new worker application
    let totalTimeOfQueuedJobs = 0;
    let queuedJobs = await WorkOrder.find({
        status: "QUEUED"
    });
    for(let idx in queuedJobs){
        console.log(queuedJobs[idx]);
        totalTimeOfQueuedJobs += queuedJobs[idx].timeRequired;
    }
    console.log("Total time required for queued jobs: " + totalTimeOfQueuedJobs);
    if(totalTimeOfQueuedJobs > MAX_THRESHOLD_FOR_WAITING_TIME) {
        // spawn another worker
        await awsHelpers.spawnEc2Instance();
    }
    else if(totalTimeOfQueuedJobs === 0){
        await awsHelpers.killEc2Instance();
    }
});

// Setting up server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});