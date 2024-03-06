const Ingredient = require("./Ingredient");
const WorkOrder = require("./WorkOrder");

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

/*

1. U: Worker: Incorporate priority (1-2). Failure success randomness.
2. H: Manager: Minimum thresholds for each ingredient. (Calculate it for 3 pizzas of each type)
3. A: Manager: Dependency array for each type of pizza => Tomatoes, Onions -> hardcode in db -> id. t_id -> tomato pizza -> t_p_id.
4. A: Manager HTTP POST /OrderPizza -> which pizza. Push Baking, packing tasks into queue.
5. H: DB lock

0. Introduction
1. Pipeline between manaager and worker
2. Failure/success case
3. Priority based task handling by workers.
4. Inventory management. DB locks.
5. Thank you

Tomato Pizza -> 

dep = [
    "dough"
    "sauce"
    "tomato"
]



*/