const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    // id is autopopulated.
    name: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    }
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;