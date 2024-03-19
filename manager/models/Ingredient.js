const mongoose = require('mongoose');
const generateDefaultHourlyUsage = () => {
    const defaultDict = {};
    for (let i = 1; i <= 24; i++) {
        defaultDict[i] = 0;
    }
    return defaultDict;
};
const ingredientSchema = new mongoose.Schema({
    // id is autopopulated.
    name: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    hourlyUsage: {
        type: Object,
        default: generateDefaultHourlyUsage
    }
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;