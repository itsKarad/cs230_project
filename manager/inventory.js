const Ingredient = require("./models/Ingredient");
const pizzas = require("./dependency");
const WorkOrder = require("./models/WorkOrder");
const workQueueHelpers = require("./workqueue");
const { removeIngredient } = require("./modify_database");

checkIfPresentInInventory = async (ing_name, quantity) => {
    let ingredient;
    console.log("Searching for " + ing_name);
    ingredient = await Ingredient.findOne({ name: ing_name });
    if (ingredient.quantity <= 3) {
        // add to queue for restocking.
        // workQueueHelpers.produceTasks().sendToQueue(
        //     "restock_queue",
        //     Buffer.from(JSON.stringify(ingredient)),
        //     {
        //         persistent: true,
        //     }
        // );
    }
    return ingredient.quantity >= quantity;
}

exports.checkIfPizzaCanBeMade = async (pizza_name, quantity) => {
    let pizzaIngredients = pizzas[pizza_name];
    console.log(pizzaIngredients);
    if(pizzaIngredients == null){
        return false;
    }
    for(let i in pizzaIngredients){
        if (!(await checkIfPresentInInventory(pizzaIngredients[i], quantity))) {
            // reduce qty => ADD row LOCK for each ingredient.
            return false;
        } else {
            await removeIngredient(pizzaIngredients[i]);
        }
    }
    return true;
}

const createWorkOrder = async(name, qty, priority, timeReqd) => {
    // Create an instance of the MyObject model
    const order = new WorkOrder({
        name: name,
        quantity: qty,
        priority: priority,
        timeRequired: timeReqd
    });

    // // Save the object to the database
    await order.save();

    return order;
}

exports.seedDB = async() => {
    console.log("Saving initial orders to DB");
    let orders = [];
    orders.push(await createWorkOrder("Prepare Sauce", 5, 3, 5));
    orders.push(await createWorkOrder("Prepare Toppings", 5, 3, 5));
    orders.push(await createWorkOrder("Bake Pizza", 5, 3, 5));
    orders.push(await createWorkOrder("Pack Pizza for delivery", 5, 3, 5));
    orders.push(await createWorkOrder("Cut veggies for toppings", 5, 3, 5));
    return orders;
}

const createIngredient = async(name, qty) => {
    // Create an instance of the MyObject model
    const ingredient = new Ingredient({
        name: name,
        quantity: qty
    });

    // // Save the object to the database
    await ingredient.save();
    return ingredient;
}

exports.deleteExistingIngredients = async() => {
    console.log("Deleting existing ingredients from DB");
    await Ingredient.deleteMany({});
}

exports.deleteExistingWorkOrders = async() => {
    console.log("Deleting existing work orders from DB");
    await WorkOrder.deleteMany({});
}

exports.saveIngredients = async() => {
    console.log("Saving initial ingredients to DB");
    let ingredients = [];
    ingredients.push(await createIngredient("Tomato", 100));
    ingredients.push(await createIngredient("Onions", 100));
    ingredients.push(await createIngredient("Sauce", 100));
    ingredients.push(await createIngredient("Cheese", 100));
    ingredients.push(await createIngredient("BBQ Chicken", 100));
    ingredients.push(await createIngredient("Dough", 100));
    return ingredients;
}