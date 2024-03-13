const mongoose = require("mongoose");
const Ingredient = require("./models/Ingredient");

const LOCK_COLLECTION_NAME = "locks";

db = mongoose.connection;

removeIngredient = async (ingredientName) => {
    const ingredient = await Ingredient.findOne({ name: ingredientName });
    const taskId = ingredient._id;
    try {
        if (await acquireLock(taskId)) {
            ingredient.quantity -= 1;
            await ingredient.save();
            console.log("Removed ingredient", ingredientName);
            console.log(`${ingredientName} quantity is now ${ingredient.quantity}`);
            await releaseLock(taskId);
        } else {
            console.log("Failed to acquire lock");
        }
    } catch (e) {
        console.log(e);
        await releaseLock(taskId);
    }
};

addIngredient = async (ingredientName) => {
    const ingredient = await Ingredient.findOne({ name: ingredientName });
    const taskId = ingredient._id;
    try {
        if (await acquireLock(taskId)) {
            ingredient.quantity += 1;
            await ingredient.save();
            console.log("Added ingredient", ingredientName);
            await releaseLock(taskId);
        } else {
            console.log("Failed to acquire lock");
        }
    } catch (e) {
        console.log(e);
        await releaseLock(taskId);
    }
};

acquireLock = async (taskId) => {
    const lockCollection = await db.collection(LOCK_COLLECTION_NAME);
    // Attempt to acquire lock
    const result = await lockCollection.updateOne(
        { _id: taskId, locked: false },
        { $set: { locked: true } },
        { upsert: true }
    );

    return result.modifiedCount > 0 || result.upsertedCount > 0;
};

releaseLock = async (taskId) => {
    const lockCollection = await db.collection(LOCK_COLLECTION_NAME);
    // Release lock
    await lockCollection.updateOne({ _id: taskId }, { $set: { locked: false } });
};

module.exports = { removeIngredient };
