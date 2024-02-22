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

const seedDB = async() => {
    let orders = [];
    orders.push(await createWorkOrder("Prepare Sauce", 5, 3, 5));
    orders.push(await createWorkOrder("Prepare Toppings", 5, 3, 5));
    orders.push(await createWorkOrder("Bake Pizza", 5, 3, 5));
    orders.push(await createWorkOrder("Pack Pizza for delivery", 5, 3, 5));
    orders.push(await createWorkOrder("Cut veggies for toppings", 5, 3, 5));
    return orders;
}

module.exports = seedDB;