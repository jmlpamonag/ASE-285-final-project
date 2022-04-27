// npm install -> npm install -g nodemon -> npm start

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// ==================================
// CONNECT TO DATABSE
// ==================================
const MongoClient = require('mongodb').MongoClient;
var db;
MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true }, function (error, client) {
    if (error) return console.log(error)
    db = client.db('test');
});

// ==================================
// CONSTANTS
// ==================================

const status = {
    registered: 1,
    unregistered: 0
}



// ==================================
// START - CONFIG
// ==================================

// -> start
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash')
const session = require('express-session')

const initializePassport = require('./passport-config')

initializePassport
    (passport,
        (em) => { return db.collection('user').findOne({ email: em, status: status.registered }).then(result => { return result; }) },
        (i) => { return db.collection('user').findOne({ _id: i, status: status.registered }).then(result => { return result; }) }
    );
// -> end

const express = require('express');
const app = express();
const bodyParser= require('body-parser')
const methodOverride = require('method-override')

app.use(bodyParser.urlencoded({extended: true})) 
app.use(express.urlencoded({extended: true})) 
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(methodOverride('_method'))

// -> start
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
// -> end

app.listen(5500, function() {
    console.log('listening on 5500')
});

// ==================================
// END - CONFIG
// ==================================

// ==================================
// START - ROUTES - PAMONAG
// ==================================

// root -> defaults to the log-in page (modified from default route)
app.get('/', checkNotAuthenthicated, function (req, resp) {
    resp.render('log-in.ejs', {
        name: '',
        email: '',
        password: ''
    });
});

// GET: Login
app.get('/login', checkNotAuthenthicated, function (req, resp) {
    resp.render('log-in.ejs', {
        name: '',
        email: '',
        password: ''
    });
});

// POST: Login
app.post('/login', checkNotAuthenthicated, passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true

}))
// GET: Home
app.get('/home', checkAuthenthicated, function (req, res) {
    res.render('home.ejs', { firstName: req.user?.firstName, lastName: req.user?.lastName, email: req.user?.email });
})

// GET: Register
app.get('/register', checkNotAuthenthicated, function (req, res) {
    res.render('register', {
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    })
});

// POST: Register
app.post('/register', checkNotAuthenthicated, async function (req, resp) {

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        db.collection('usercount').findOne({ name: 'Total User' }, function (error, data) {

            var totalUser = data.totalUser

            db.collection('user').insertOne({
                _id: totalUser + 1,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: hashedPassword,
                status: status.registered
            }, function (error, data) {
                if (error) {
                    console.log(error)
                    resp.redirect('/register')
                }

                db.collection('usercount').updateOne({ name: 'Total User' }, { $inc: { totalUser: 1 } }, function (error, data) {
                    if (error) { return console.log(error) }

                    req.flash("success", "You have been registered! Please log-in");
                    resp.redirect("/login")
                })
            })
        })


    } catch (e) {
        console.log(e)
    }
});

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

app.delete('/unregister', (req, res) => {
    console.log(req.user?._id);

    let userId = req.user?._id

    db.collection('user').updateOne({ _id: userId }, { $set: { status: status.unregistered } }, function (error, resp) {
        if (error) { return console.log(error) }
        req.logOut()
        res.redirect('/login')
    })
})
// ==================================
// END - ROUTES - PAMONAG
// ==================================


// ==================================
// START - ROUTES - DEFAULT
// ==================================

// -> / changed to /write

app.get('/write', checkAuthenthicated, function(req, resp) {
    resp.render('write.ejs');
})

app.post('/add', checkAuthenthicated, function(req, resp) {
    console.log(req.body);

    db.collection('counter').findOne({name : 'Total Post'}, function(error, res) {
        var totalPost = res.totalPost
    
        db.collection('post').insertOne({ _id : totalPost + 1, title : req.body.title, date : req.body.date }, function (error, res) {
            if(error){return console.log(error)}
            db.collection('counter').updateOne({name : 'Total Post'},{ $inc: {totalPost:1} },function(error, res){
                if(error){return console.log(error)}

                resp.redirect('/list')
            })
        })
    })
});

app.get('/list', checkAuthenthicated, function(req, resp){
    db.collection('post').find().toArray(function(error, res){
        console.log(res)
        resp.render('list.ejs', { posts: res })
    })
});

app.delete('/delete', checkAuthenthicated, function(req, resp){
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

app.get('/detail/:id', checkAuthenthicated, function(req, resp){
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

app.post('/edit', checkAuthenthicated, function(req, resp) {     
    console.log(req.body.id)
    resp.redirect(`/edit/${req.body.id}`)
})

app.get('/edit/:id', checkAuthenthicated, function(req, resp) { 
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

app.put('/edit', checkAuthenthicated, function(req, resp) {
    db.collection('post').updateOne( {_id : parseInt(req.body.id)}, {$set : { title : req.body.title, date : req.body.date }}, function(){
        console.log('app.put.edit: Update complete')
        resp.redirect('/list')
    });
});

// ==================================
// END - ROUTES - DEFUALT
// ==================================


// ==================================
// START - FUNCTIONS
// ==================================
function checkAuthenthicated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}

function checkNotAuthenthicated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/home')
    }

    next()
}
// ==================================
// END - FUNCTIONS
// ==================================
