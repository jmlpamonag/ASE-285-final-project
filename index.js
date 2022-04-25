// npm install express
// npm install ejs
// npm install -g nodemon
// npm install method-override
// nodemon ./index.js
// Access this server with http://localhost:5500/pet or http://localhost:5500/

const MongoClient = require('mongodb').MongoClient;

// You should change ID/PASSWORD/NET for your project
// Goto your mongodb Atlas https://cloud.mongodb.com
// From the left column, click Databases in DEPLOYMENT
// Create database
//   Atlas tab -> Browse Collections -> Add My Own Data
//   then make todoapp/post
// Get the information
//   Atlas tab -> Connect -> Connect Your Application
const ID= 'test';
const PASSWORD = 'test';
const DATABASE = 'toyproject';
const NET = 'toyproject.kk1zg.mongodb.net';

const URL = `mongodb+srv://${ID}:${PASSWORD}@${NET}/${DATABASE}?retryWrites=true&w=majority`;

var db;
MongoClient.connect(URL, { useUnifiedTopology: true }, function (error, client) {
    if (error) return console.log(error)
    db = client.db('toyproject');
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

app.listen(5500, function() {
    console.log('listening on 5500')
});

app.get('/', function(req, resp) { 
    resp.render('write.ejs');
});

app.post('/add', function(req, resp) {
    console.log(req.body);

    db.collection('counter').findOne({name : 'Total Post'}, function(error, res) {
        var totalPost = res.totalPost
    
        db.collection('post').insertOne({ _id : totalPost + 1, title : req.body.title, date : req.body.date }, function (error, res) {
            if(error){return console.log(error)}
            db.collection('counter').updateOne({name : 'Total Post'},{ $inc: {totalPost:1} },function(error, res){
                if(error){return console.log(error)}
                // Move to List <-- Changed
                // resp.send('Stored to Mongodb OK');
                resp.redirect('/list')
            })
        })
    })
});

app.get('/list', function(req, resp){
    db.collection('post').find().toArray(function(error, res){
        console.log(res)
        resp.render('list.ejs', { posts: res })
    })
});

app.delete('/delete', function(req, resp){
    req.body._id = parseInt(req.body._id); // the body._id is stored in string, so change it into an int value
    console.log(req.body._id);
    db.collection('post').deleteOne(req.body, function(error, res) {
        console.log('Delete complete')
    })

    // Fix the bug - the totalPost is not decreased by 1 <-- Fixed   
    db.collection('counter').updateOne({name : 'Total Post'},{ $inc: {totalPost:-1} },function(error, res){
        if(error){return console.log(error)}
        resp.send('Counter decreased by 1');
    })
}); 

app.get('/detail/:id', function(req, resp){
    // req.params.id contains the value of :d
    db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(error, res){
        if (error) {
            console.log(error); 
            resp.status(500).send({ error: 'Error from db.collection().findOne()' })
        }
        else {
            console.log('app.get.detail: Update complete')
            console.log({data:res});
            if (res != null) {
                resp.render('detail.ejs', {data: res} )
            }
            else {
                console.log(error); 
                resp.status(500).send({ error: 'result is null' })
            }
        }
    })
});

app.post('/edit', function(req, resp) {     
    console.log(req.body.id)
    resp.redirect(`/edit/${req.body.id}`)
})

app.get('/edit/:id', function(req, resp) { 
    console.log(req.params)
    db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(error, res){
        if (error) {
            console.log(error); 
            resp.status(500).send({ error: 'Error from db.collection().findOne()' })
        }
        else {
            console.log({data:res});
            if (res != null) {
                console.log({data:res}) 
                resp.render('edit.ejs', {data: res} )
            }
            else {
                console.log(error); 
                resp.status(500).send({ error: 'result is null' })
            }
        }
    })
});

app.put('/edit', function(req, resp) {
    db.collection('post').updateOne( {_id : parseInt(req.body.id)}, {$set : { title : req.body.title, date : req.body.date }}, function(){
        console.log('app.put.edit: Update complete')
        resp.redirect('/list')
    });
});
