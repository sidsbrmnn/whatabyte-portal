require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0').Strategy;
const querystring = require('querystring');
const url = require('url');
const util = require('util');

const app = express();

passport.use(
    new Auth0Strategy(
        {
            domain: process.env.AUTH0_DOMAIN,
            clientID: process.env.AUTH0_CLIENT_ID,
            clientSecret: process.env.AUTH0_CLIENT_SECRET,
            callbackURL: process.env.AUTH0_CALLBACK_URL,
        },
        function (accessToken, refreshToken, extraParams, profile, done) {
            const user = {
                id: profile.id,
                displayName: profile.displayName,
            };
            done(null, user);
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        cookie: {
            secure: process.env.NODE_ENV === 'production',
        },
        resave: false,
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();

    next();
});

function ensureAuthenticated(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }

    next();
}

app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/user', ensureAuthenticated, (req, res) => {
    res.render('user', {
        title: 'Profile',
        user: req.user,
    });
});

app.get(
    '/login',
    passport.authenticate('auth0', {
        scope: 'openid email profile',
        successReturnToOrRedirect: '/',
        failureRedirect: '/login',
    })
);

app.get(
    '/callback',
    passport.authenticate('auth0', { failureRedirect: '/login' }),
    (req, res) => {
        const { returnTo } = req.session;
        delete req.session.returnTo;

        res.redirect(returnTo || '/');
    }
);

app.get('/logout', (req, res) => {
    req.logout();

    let returnTo = req.protocol + '://' + req.hostname;
    const port = req.connection.localPort;

    if (port !== undefined && port !== 80 && port !== 443)
        returnTo += ':' + port;

    const logoutURL = new url.URL(
        util.format('https://%s/v2/logout', process.env.AUTH0_DOMAIN)
    );
    const searchString = querystring.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        returnTo: returnTo,
    });
    logoutURL.search = searchString;

    res.redirect(logoutURL.href);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(PORT, () => {
    console.log(`Listening on port :${PORT}`);
});
