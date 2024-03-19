const mongoose = require("mongoose");
const Ingredient = require("./models/Ingredient");

const LOCK_COLLECTION_NAME = "locks";

db = mongoose.connection;

const removeIngredient = async (ingredientName, quantity) => {
    const ingredient = await readIngredient(ingredientName);
    const taskId = ingredient._id;
    try {
        if (await acquireLock(taskId)) {
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
    const ingredient = await readIngredient(ingredientName);
    const taskId = ingredient._id;
    try {
        if (await acquireLock(taskId)) {
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
    const lockAcquired = await acquireLock(ingredientName);

    if (!lockAcquired) {
      console.log(`Failed to acquire lock for ingredient ${ingredientName}.`);
      return null;
    }

    // Read the ingredient from MongoDB
    const ingredient = await Ingredient.findOne({
      name: ingredientName,
    });
    if (!ingredient) {
      console.log(`Ingredient ${ingredientName} not found.`);
      return null;
    }

    console.log(`Ingredient ${ingredientName} read successfully:`, ingredient);

    return ingredient;
  } finally {
    // Always release the lock, even if an error occurs
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
