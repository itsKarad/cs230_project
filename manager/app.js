const express = require("express");
const connectDB = require("./connect-db");
const workQueueHelpers = require("./workqueue");
const inventoryHelpers = require("./inventory");
const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Database connection at server start
connectDB();

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
    if(!(await inventoryHelpers.checkIfPizzaCanBeMade(pizza_name, quantity))){
        res.status(201).json({
            result: "Failed, not enough stock;"
        });
    }
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
const PORT = process.env.PORT || 8082;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});