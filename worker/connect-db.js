const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

// Load config
dotenv.config({ path: "./config.env" });

// Establishing connection to MongoDB database
const uri = "<YOUR_MONGODB_URI>";
const connectDB = async () => {
    mongoose.connect(uri, {useNewUrlParser: true,useUnifiedTopology: true})
    .then(()=>{
        console.log("Database Connected!");
    })
    .catch(err=>{
        console.log(err);
    });
}

module.exports = connectDB;