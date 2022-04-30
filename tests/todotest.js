const MongoClient = require('mongodb').MongoClient;
var db;

const MONGO_URI = 'mongodb+srv://test:test@toyproject.kk1zg.mongodb.net/test?retryWrites=true&w=majority'
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true }, function (error, client) {
    try {
        if (error) { return console.log(error) };
        db = client.db('toyproject');
        db.command({ ping: 1 });
        console.log("MongoDB Connected");
    } catch (tryErr) {
        console.log(tryErr);
        console.log("Error connecting");
    }
});

const express = require('express');
const app = express();
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))

app.set('view engine', 'ejs');
app.listen(5500, function () {
    console.log('listening on 5500')
});

// * GET
// load updated todo list
app.get("/todo", (req, resp) => {
    db.collection('post').find().toArray(function (error, res) {
        resp.render('../todo.ejs', { posts: res });
    });
});

//* PUT
// check off a task as completed
app.put("/todo", (req, resp) => {
    if (req.body.val == false || req.body.val == true) {
        try {
            db.collection('post').updateOne({ _id: parseInt(req.body.id) }, {
                $set: {
                    status: req.body.val
                }
            }, function (error, result) {
                if (error || result.matchedCount == 0) {
                    console.log(error);
                    console.log(result);
                    resp.json({ "message": "No updates made" });
                } else {
                    resp.json({ "message": "Records Updated" });
                }
            });
        } catch (err) {
            resp.json({ "message": "No updates made, Bad Request" });
        }
    } else {
        resp.json({ "message": "Invalid val" });
    }
});

// redirects user if database is having trouble loading
/* Redirector for errors */
app.use((err, req, res, next) => {
    console.log(`${err.name} connecting to ${req.url} -- `);
    if (db == undefined) {
        console.error(err.message);
        console.error("Database is not connected");
        // wait a bit, then try again
        setTimeout(() => {
            res.redirect(307, req.url);
        }, 500);
    } else {
        // some other error, log it and redirect to main page just in case
        console.error(err);
        console.table(req.body);
        res.redirect(308, req.url);
    }
});

module.exports = {app};