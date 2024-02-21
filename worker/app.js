const express = require("express");
const app = express();

app.get("/ping", (req, res) => {
    res.send("OK")
});



// Setting server
const PORT = process.env.PORT || 8081;
app.listen(PORT, (req, res) => {
    console.log("Server is online on " + PORT);
});