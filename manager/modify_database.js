const mongoose = require("mongoose");
const Ingredient = require("./models/Ingredient");

const LOCK_COLLECTION_NAME = "locks";

db = mongoose.connection;

const removeIngredient = async (ingredientName, quantity) => {
    const ing = await Ingredient.findOne({ name: ingredientName });
    const taskId = ing._id;
    try {
        if (await acquireLock(taskId)) {
            let ingredient = await Ingredient.findOne({ name: ingredientName });
            ingredient.quantity -= quantity;
            const now = new Date();
            const currentHour = now.getHours();
            ingredient.hourlyUsage[currentHour] += quantity;
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

const addIngredient = async (ingredientName, quantity = 1) => {
    const ing = await Ingredient.findOne({ name: ingredientName });
    const taskId = ing._id;
    try {
        if (await acquireLock(taskId)) {
            let ingredient = await Ingredient.findOne({ name: ingredientName });
            ingredient.quantity += quantity;
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

const readIngredient = async (ingredientName) => {
    try {
    // Attempt to acquire lock
        if(await acquireLock(ingredientName)){
            const ingredient = await Ingredient.findOne({ name: ingredientName });
            await releaseLock(ingredientName);
            return ingredient;
        } else {
            console.log("Failed to acquire lock");
            return null;
        }
    } catch (e) {
        console.log(e);
        await releaseLock(ingredientName);
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

module.exports = {
    removeIngredient,
    addIngredient,
    readIngredient
};
