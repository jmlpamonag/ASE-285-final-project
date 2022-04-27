const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const { get } = require('express/lib/response')

function initialize(passport, getUserByEmail, getUserById) {
    const authenthicateUser = async (email, password, done) => {
        const user = await getUserByEmail(email)

        if (user == null) {
            return done(null, false, {message: 'No user with that email'})
        }

        try {

            if (await bcrypt.compare(password, user.password)) {
                return done(null, user)
            } else {
                return done(null, false, {message: 'Password Incorrect'})
            }
        } catch(e) {
            return done(e)
        }
    }

    passport.use(new LocalStrategy({usernameField: 'email' }, authenthicateUser));
    passport.serializeUser((user, done) => done(null, user._id))
    passport.deserializeUser( async (id, done) => {
        const user = await getUserById(id);
        return done(null, user)
        // return done(null, getUserById(id))
    })
}

module.exports = initialize