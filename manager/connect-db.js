const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

// Load config
dotenv.config({ path: "./config.env" });

// Establishing connection to MongoDB database
const uri = "mongodb+srv://cs230:PHfIS47vx8uTrINM@cluster0.vhylelw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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