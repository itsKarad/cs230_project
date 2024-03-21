const express = require("express");
const connectDB = require("./connect-db");
const workQueueHelpers = require("./workqueue");
const WorkOrder = require("./models/WorkOrder");
const inventoryHelpers = require("./inventory");
const app = express();
const cron = require("node-cron");
const awsHelpers = require("./aws");
const databaseHelper = require("./modify_database");

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));

const INITIAL_STOCK_QUANTITY = 100;

// Database connection at server start
connectDB();
workQueueHelpers.createWorkQueueConnection();

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
    let orders = [];
    for(let i = 0; i < quantity; i++){
        let order = await inventoryHelpers.createWorkOrder(pizza_name, 1, 2, 100);
        orders.push(order);
    }
    // Dispatch order for making the pizza
    await workQueueHelpers.produceTasks(orders);
    res.status(201).json({
        result: "Order success"
    });
});

app.get("/load", async(req, res) => {
    await inventoryHelpers.deleteExistingWorkOrders();
    await inventoryHelpers.deleteExistingIngredients();
	// empty lock collection
	await databaseHelper.emptyLockCollection();

    let ingredients = await inventoryHelpers.saveIngredients();
    let tasksList = await inventoryHelpers.createWorkOrdersForIngredientStockUp(ingredients, INITIAL_STOCK_QUANTITY);
    await workQueueHelpers.produceTasks(tasksList);
    res.send("OK")
});

const MAX_THRESHOLD_FOR_WAITING_TIME = 300;// 20 mins
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
    let numOfWorkerInstances = await awsHelpers.countWorkerEc2Instances();
    numOfWorkerInstances += 1;
    if(totalTimeOfQueuedJobs / numOfWorkerInstances > MAX_THRESHOLD_FOR_WAITING_TIME) {
        // spawn another worker
        await awsHelpers.spawnEc2Instance();
    }
    else if(totalTimeOfQueuedJobs === 0){
        await awsHelpers.killEc2Instance();
    }
});

cron.schedule('*/1 * * * *', async() => {
    console.log("Executing cron job to stock up most used ingredients in last hour...");
    // this function will be called every hour via cron job to update stock
    // Function to make extra stick order based on last hour usage of ingredients
    const lastHourUsage = {
        'Tomato': 0,
        'Onions': 0,
        'Sauce': 0,
        'Cheese': 0,
        "BBQ Chicken": 0,
        'Dough': 0
    };

    const now = new Date();
    const prevHour = now.getHours() - 1;

    if (prevHour < 0) {
        console.log("Aborting stock up, no historical data.");
        return;
    }
    console.log("Time now: " + now);
    console.log("Checking usage of ingredients in " + prevHour + "th hour");

    //creating orders for stock = 20% of prev hour usage
    for (const ingredient of Object.keys(lastHourUsage)) {
        const ingredientDemand = await databaseHelper.readIngredient(ingredient);
        lastHourUsage[ingredient] = parseInt(0.2 * (ingredientDemand.hourlyUsage ? ingredientDemand.hourlyUsage[prevHour] || 0 : 0));
        console.log("Stocking up " + ingredient + " with quantity " + lastHourUsage[ingredient]);
    }

    let workOrders = [];

    // creating order for stock
    for (let ingredient in lastHourUsage) {
        if(lastHourUsage[ingredient] === 0)
            continue;
        let wo = await inventoryHelpers.createWorkOrder(ingredient, lastHourUsage[ingredient], 4, 5, true);
        workOrders.push(wo);
    }
    await workQueueHelpers.produceTasks(workOrders)
});

// Setting up server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});