require('dotenv').config();
const express = require('express');
const expressSession = require('express-session');
const path = require('path');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');

const app = express();

const strategy = new Auth0Strategy(
	{
		domain: process.env.AUTH0_DOMAIN,
		clientID: process.env.AUTH0_CLIENT_ID,
		clientSecret: process.env.AUTH0_CLIENT_SECRET,
		callbackURL: process.env.AUTH0_CALLBACK_URL
	},
	function(accessToken, refreshToken, extraParams, profile, done) {
		return done(null, profile);
	}
);

const session = {
	secret: process.env.SESSION_SECRET,
	cookie: {
		secure: false
	},
	resave: false,
	saveUninitialized: false
};

if (process.env.NODE_ENV === 'production') session.cookie.secure = true;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession(session));
passport.use(strategy);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.isAuthenticated();

	next();
});

const auth = (req, res, next) => {
	if (req.user) return next();

	req.session.returnTo = req.originalUrl;
	res.redirect('/login');
};

app.get('/', (req, res) => {
	res.render('index', { title: 'Home' });
});

app.get('/user', auth, (req, res, next) => {
	const { _raw, _json, ...userProfile } = req.user;

	res.render('user', {
		title: 'Profile',
		userProfile
	});
});

app.use('/', require('./routes/auth'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log('Listening on port', PORT);
});
