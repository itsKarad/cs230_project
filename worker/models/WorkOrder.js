const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
    // id is autopopulated.
    name: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    priority: {
        type: Number,
        required: true,
    },
    timeRequired: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['CREATED', 'QUEUED', 'EXECUTING', 'COMPLETED'],
        required: true
    },
    stockFlag:{
        type: Boolean,
        default:false
    }
});

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

module.exports = WorkOrder;