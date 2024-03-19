const Ingredient = require("./models/Ingredient");
const pizzas = require("./dependency");
const WorkOrder = require("./models/WorkOrder");
const workQueueHelpers = require("./workqueue");
const databaseHelper = require("./modify_database");
const { removeIngredient } = require("./modify_database");

checkIfPresentInInventory = async (ing_name, quantity) => {
    let ingredient;
    console.log("Searching for " + ing_name);
    ingredient = await databaseHelper.readIngredient(ing_name);
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
            await removeIngredient(pizzaIngredients[i], quantity);
        }
    }
    return true;
}

exports.createWorkOrder = async(name, qty, priority, timeReqd, stockFlag  = false) => {
    // Create an instance of the MyObject model
    const order = new WorkOrder({
        name: name,
        quantity: qty,
        priority: priority,
        timeRequired: timeReqd,
        status: "CREATED",
        stockFlag: stockFlag
    });

    // // Save the object to the database
    await order.save();

    return order;
}

exports.createWorkOrdersForIngredientStockUp = async(ingredients, quantity) => {
    console.log("Saving initial orders to DB");
    let orders = [];
    for(let i=0; i<ingredients.length; i++){
        orders.push(await this.createWorkOrder(ingredients[i].name, quantity, 3, 5, true));
    }
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
    ingredients.push(await createIngredient("Tomato", 0));
    ingredients.push(await createIngredient("Onions", 0));
    ingredients.push(await createIngredient("Sauce", 0));
    ingredients.push(await createIngredient("Cheese", 0));
    ingredients.push(await createIngredient("BBQ Chicken", 0));
    ingredients.push(await createIngredient("Dough", 0));
    return ingredients;
}
