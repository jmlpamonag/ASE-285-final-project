if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// ==================================
// CONNECT TO DATABSE
// ==================================
const MongoClient = require('mongodb').MongoClient;
var db;
MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true }, function (error, client) {
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

const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash')
const session = require('express-session')
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const initializePassport = require('./passport-config')

initializePassport
    (passport,
        (em) => { return db.collection('user').findOne({ email: em, status: status.registered }).then(result => { return result; }) },
        (i) => { return db.collection('user').findOne({ _id: i, status: status.registered }).then(result => { return result; }) }
    );



app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(methodOverride('_method'))

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

app.listen(5500, function () {
    console.log('listening on 5500')
});

// ==================================
// END - CONFIG
// ==================================

// ==================================
// START - ROUTES - PAMONAG
// ==================================

app.get('/', checkNotAuthenthicated, function (req, resp) {
    resp.render('log-in.ejs');
});

app.get('/login', checkNotAuthenthicated, function (req, resp) {
    resp.render('log-in.ejs');
});

app.post('/login', checkNotAuthenthicated, passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true

}))

app.get('/home', checkAuthenthicated, function (req, res) {
    res.render('home.ejs', { firstName: req.user?.firstName, lastName: req.user?.lastName, email: req.user?.email });
})

app.get('/register', checkNotAuthenthicated, function (req, res) {
    res.render('register.ejs')
});

app.post('/register', checkNotAuthenthicated, async function (req, resp) {

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        db.collection('user').findOne({ email: req.body.email, status: status.registered  }).then(result => {
            if (result) {
                req.flash("alert", "A user account is already connected to this email. Please choose another email.")
                return resp.status(400).redirect('/register')
            } else {
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
                            resp.status(200).redirect("/login")
                        })
                    })
                })
            }
        })
    } catch (e) {
        console.log(e)
    }
});

app.delete('/logout', (req, res) => {
    req.logOut()
    req.flash("success", "You are now logged out.")
    res.status(200).redirect('/login')
})

app.delete('/unregister', (req, res) => {
    console.log(req.user?._id);

    let userId = req.user?._id;

    db.collection('user').updateOne({ _id: userId }, { $set: { status: status.unregistered } }, function (error, resp) {
        if (error) { return console.log(error) }
        req.logOut()
        req.flash("alert", "You account is now unregistered.")
        res.status(200).redirect('/login')
    })
})

// ==================================
// END - ROUTES - PAMONAG
// ==================================


// ==================================
// START - ROUTES - DEFAULT
// ==================================

// -> / changed to /write

app.get('/write', checkAuthenthicated, function (req, resp) {
    db.collection('post').distinct('groupname',
        function (err, result) {
            resp.render('write.ejs', { groupnames: result });
        })
})

app.post('/add', checkAuthenthicated, function (req, resp) {
    // check for empty body
    if (req.body == {} || req.body == "{}") {
        // send error response
        resp.status(400).send("Bad Request");
    } else {
        db.collection('counter').findOne({ name: 'Total Post' }, function (countError, countRes) {
            // get and store total post count
            var totalPost = countRes.totalPost;

            //generate the post entry for logging
            // add false status so that the task is initially incomplete
            let postEntry = {
                _id: totalPost + 1,
                title: req.body.title,
                date: req.body.date,
                description: req.body.description,
                groupname: req.body.groupname,
                status: false
            };

            db.collection('post').insertOne(postEntry, function (postError, postRes) { // add post to data base
                if (postError) { return console.log(postError) } // if error, return error

                db.collection('counter').updateOne({ name: 'Total Post' }, { $inc: { totalPost: 1 } }, function (incError, incRes) { // increment counter
                    // if there's a problem, log it
                    if (incError) { return console.log(incError) }

                    // Log updated data
                    console.log("Data that was logged: ");
                    console.table(req.body);

                    // generate response
                    resp.redirect(301, "/list");
                });
            });
        });
    }
});

app.get('/list', checkAuthenthicated, function (req, resp) {
    db.collection('post').find().toArray(function (error, res) {
        console.log(res)
        resp.render('list.ejs', { posts: res })
    });
});

app.get('/list/:groupname', checkAuthenthicated, function (req, resp) {
    console.log(req.params)
    db.collection('post').find({ "groupname": req.params.groupname }).toArray(function (error, res) {
        console.log(res)
        resp.render('list.ejs', { posts: res })
    })
});

app.delete('/delete', checkAuthenthicated, function (req, resp) {
    req.body._id = parseInt(req.body._id); // the body._id is stored in string, so change it into an int value
    console.log(req.body._id);

    db.collection('post').deleteOne(req.body, function (error, res) {
        console.log(`Delete of task ${req.body._id} was successful`);

        resp.status(200).send("Successfully Deleted");
    });
});

app.get('/tasks/:id', checkAuthenthicated, function (req, resp) {
    // req.params.id contains the value of :d
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (error, res) {
        if (error) {
            console.log(error);
            resp.status(500).send({ error: 'Error from db.collection().findOne()' })
        } else {
            console.log('app.get.detail: Update complete')
            console.log({ data: res });
            if (res != null) {
                resp.render('detail.ejs', { data: res })
            } else {
                console.log(error);
                resp.status(500).send({ error: 'result is null' })
            }
        }
    })
});

app.post('/edit', checkAuthenthicated, function (req, resp) {
    console.log(req.body.id)
    resp.redirect(`/edit/${req.body.id}`)
})

app.get('/edit/:id', checkAuthenthicated, function (req, resp) {
    console.log(req.params)
    db.collection('post').findOne({ _id: parseInt(req.params.id) }, function (error, res) {
        if (error) {
            console.log(error);
            resp.status(500).send({ error: 'Error from db.collection().findOne()' })
        } else {
            console.log({ data: res });
            if (res != null) {
                console.log({ data: res })
                resp.render('edit.ejs', { data: res })
            } else {
                console.log(error);
                resp.status(500).send({ error: 'result is null' })
            }
        }
    })
});

app.put('/edit', checkAuthenthicated, function (req, resp) {
    db.collection('post').updateOne({ _id: parseInt(req.body.id) }, {
        $set: {
            title: req.body.title,
            date: req.body.date,
            description: req.body.description,
            groupname: req.body.groupname
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
            resp.redirect(`/tasks/${req.body.id}`);
        } else if (result.matchedCount > 0) {
            console.log(result);
            console.log('app.put.edit: Update complete');
            resp.redirect(`/tasks/${req.body.id}`);
        } else {
            resp.redirect(`/list`);
        }
    });
});

// ==================================
// END - ROUTES - DEFUALT
// ==================================


// ==================================
// BEGIN - ROUTES - GAINES
// ==================================

// * GET
// load updated todo list
app.get("/todo", checkAuthenthicated, (req, resp) => {
    db.collection('post').find().toArray(function (error, res) {
        resp.render('todo.ejs', { posts: res });
    });
});

//* PUT
// check off a task as completed
app.put("/todo", checkAuthenthicated, (req, resp) => {
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
// ==================================
// END - ROUTES - GAINES
// ==================================

// ==================================
// START - FUNCTIONS - PAMONAG
// ==================================

function checkAuthenthicated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    req.flash("alert", "Please log in to acess this feature.")
    res.status(400).redirect('/login')
}

function checkNotAuthenthicated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.status(400).redirect('/home')
    }

    next()
}
// ==================================
// END - FUNCTIONS - PAMONAG
// ==================================

// ==================================
// START - ROUTES - HOANG
// ==================================

let pdf = require("html-pdf");
let path = require("path");
let ejs = require("ejs")

app.get("/topdf", (req, res) => {

    height = req.params.height
    height = req.params.weight
    db.collection('post').find().toArray(function (error, posts) {

        ejs.renderFile(path.join(__dirname, './views/', "downloadpdf.ejs"), posts, (err, data) => {
            if (err) {
                res.send(err);
            } else {
                let options = {
                    "height": `11.25in`,
                    "width": `8.5in`,
                    "header": {
                        "height": "20mm"
                    },
                    "footer": {
                        "height": "20mm",
                    },
                };
                pdf.create(data, options).toFile("report.pdf", function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.sendFile(__dirname + "/report.pdf");
                    }
                });
            }
            console.log(posts);
        })
    })
})
//test api route
app.get("/testtopdf", (req, res) => {

    let posts = [
        {
            title: "something",
            title: "date",
            title: "description"
        },
        {
            title: "something",
            title: "date",
            title: "description"
        },
        {
            title: "something",
            title: "date",
            title: "description"
        }
    ]

    ejs.renderFile(path.join(__dirname, './views/', "downloadpdf.ejs"), posts, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            let options = {
                "height": `11.25in`,
                "width": `$8.5in`,
                "header": {
                    "height": "20mm"
                },
                "footer": {
                    "height": "20mm",
                },
            };
            pdf.create(data, options).toFile("report.pdf", function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    res.sendFile(__dirname + "/report.pdf");
                }
            });
        }
        console.log(posts);

    })
})


app.get("/tomd", (req, res) => {

    db.collection('post').find().toArray(function (error, posts) {
        console.log(posts)
        res.render("downloadmd.ejs", { posts: posts })

    })

})

// ==================================
// END - ROUTES - HOANG
// ==================================
