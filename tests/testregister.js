const MongoClient = require('mongodb').MongoClient;

var db;
var URL = 'mongodb+srv://test:test@toyproject.kk1zg.mongodb.net/test?retryWrites=true&w=majority';
MongoClient.connect(URL, { useUnifiedTopology: true }, function (error, client) {
    if (error) return console.log(error)
    db = client.db('test');
});

const express = require('express');
const app = express();
const bodyParser= require('body-parser')
const methodOverride = require('method-override')

app.use(bodyParser.urlencoded({extended: true})) 
app.use(express.urlencoded({extended: true})) 
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(methodOverride('_method'))
app.use(express.json())

app.listen(5500, function() {
    console.log('listening on 5500')
});

app.post('/api/register', function (req, resp) {
    try {
        db.collection('user').findOne({ email: req.body.email, status: 1}).then(result => {
            if (result) {
                return resp.status(400).json({ message: 'An user account has already been connected to this email. Please try another email.' })
            } else {
                db.collection('usercount').findOne({ name: 'Total User' }, function (error, data) {

                    var totalUser = data.totalUser

                    db.collection('user').insertOne({
                        _id: totalUser + 1,
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        email: req.body.email,
                        password: req.password,
                        status: 1
                    }, function (error, data) {
                        if (error) {
                            return resp.status(500).json({ message: "Something has failed. Please try again." })
                        }

                        db.collection('usercount').updateOne({ name: 'Total User' }, { $inc: { totalUser: 1 } }, function (error, data) {
                            if (error) { return resp.status(500).json({ message: "Something has failed. Please try again." }) }
                            resp.status(200).json("You have been registered!").send()
                        })
                    })
                })
        }})
    } catch (e) {
        return resp.status(500).json({ message: "Server Error" })
    }
});

app.delete('/api/unregister', (req, res) => {
    let userId = req.body._id;

    db.collection('user').updateOne({ _id: userId }, { $set: { status: 0 } }, function (error, resp) {
        if (error) { return console.log(error) }
        res.status(200)
    })
})

app.delete('/api/logout', (req, res) => {
    res.status(200).json('Logged Out Succesfully')
})

module.exports = { app }