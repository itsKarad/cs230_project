const mongoose = require("mongoose");
const Ingredient = require("./models/Ingredient");

const LOCK_COLLECTION_NAME = "locks";

db = mongoose.connection;

const addIngredient = async (ingredientName, quantity = 1) => {
    const ingredient = await Ingredient.findOne({name: ingredientName});
    const taskId = ingredient._id;
    try {
        if (await acquireLock(ingredient.name)) {
            ingredient.quantity += quantity;
            await ingredient.save();
            console.log("Added ingredient", ingredientName);
            await releaseLock(ingredient.name);
        } else {
            console.log("Failed to acquire lock");
        }
    } catch (e) {
        console.log(e);
        await releaseLock(ingredient.name);
    }
};

const acquireLock = async (taskId) => {
    const lockCollection = await db.collection(LOCK_COLLECTION_NAME);
    // Attempt to acquire lock
    const result = await lockCollection.updateOne(
        { _id: taskId},
        { $set: { locked: true } },
        { upsert: true }
    );

    return result.modifiedCount > 0 || result.upsertedCount > 0;
};

const releaseLock = async (taskId) => {
    const lockCollection = await db.collection(LOCK_COLLECTION_NAME);
    // Release lock
    await lockCollection.updateOne({ _id: taskId }, { $set: { locked: false } });
};

module.exports = {
    addIngredient
};
