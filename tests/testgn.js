//// index.js
const express = require("express");
const index = express.Router();

const array = [{title : "a", date : "now", groupname : "frodo"}];

index.get("/write", (req, res) => {
    res.send({ groupname: "frodo" });
});

index.post("/add", (req, res) => res.send({ array }));

index.get("/list/:groupname", (req, res) => {
    var groupname = req.body.groupname;
    res.send(groupname);
    ;
});

module.exports = index;