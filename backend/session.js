const session = require('express-session');
const { randomBytes } = require('node:crypto');

const sessionMiddleware = session({
    name: 'devops.sid',
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000
    }
});

module.exports = sessionMiddleware;
