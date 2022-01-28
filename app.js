/*	Carlos N Reina
  cnreina@gmail.com
  cnreina.com
*/

/* Heroku with mongoDB
  Every Heroku app has its own Heroku-hosted Git repo.
  Deploy new versions by pushing code changes to this repo.
  Local Git repo needs to know the URL of the Heroku-hosted repo.

  Heroku's architecture requires the use of config vars.
  Express calls .listen(PORT), which makes use of the Heroku config var.
  Using || to initialize PORT's value to the first defined variable.
  When app is run on Heroku, process.env.PORT is defined and passed to .listen().
  Running locally, the config var is undefined and the localhost port is passed to .listen().

  Basic Commands:
  sudo npm install -g heroku
  heroku plugins:install heroku-repo
  heroku login
  heroku git:remote -a cse341nodejsapp
  git push heroku master:main
  heroku ps:scale web=1

  heroku logs --tail
  heroku repo:reset --app appname

  https://devcenter.heroku.com/articles/preparing-a-codebase-for-heroku-deployment
  https://devcenter.heroku.com/articles/heroku-cli#download-and-install
  https://devcenter.heroku.com/articles/git#tracking-your-app-in-git
  https://devcenter.heroku.com/articles/deploying-nodejs
  https://devcenter.heroku.com/articles/config-vars
*/


require('dotenv').config();
const express                   = require('express');
const session                   = require('express-session');
const bodyParser                = require('body-parser');

// MongoDB
const mongoose                  = require('mongoose');
const MongoDBStore              = require('connect-mongodb-session')(session);
const MONGODB_OPTIONS           = {useUnifiedTopology: true, useNewUrlParser: true, family: 4};
const MONGODB_CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;
const sessionStore              = new MongoDBStore({uri: MONGODB_CONNECTION_STRING, collection: 'sessions'});

const APP_CWD                   = process.cwd();
const PORT                      = process.env.PORT || 3000;
const HEROKU_APP_URL            = "https://cse341nodejsapp.herokuapp.com/";

const CORS_OPTIONS              = { origin: HEROKU_APP_URL, optionsSuccessStatus: 200 };
const cors                      = require('cors');

const csrf                      = require('csurf');
const flash                     = require('connect-flash');
const multer                    = require('multer');

// ENTITIES
const User                      = require(APP_CWD + '/models/userSchema');

// CONTROLLERS
const sessionController         = require(APP_CWD + '/controllers/sessionController');
const authController            = require(APP_CWD + '/controllers/authController');
const errorController           = require(APP_CWD + '/controllers/errorController');
const csrfProtection            = csrf();
const fileStorage               = multer.diskStorage({destination: (req, file, callBack) => {
    callBack(null, 'images');
  },
  filename: (req, file, callBack) => {
    callBack(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter  = (req, file, callBack) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    callBack(null, true);
  } else {
    callBack(null, false);
  }
};

// ROUTES
const homeRoutes    = require(APP_CWD + '/routes/homeRoutes');
const userRoutes    = require(APP_CWD + '/routes/userRoutes');
const storeRoutes   = require(APP_CWD + '/routes/storeRoutes');
const authRoutes    = require(APP_CWD + '/routes/authRoutes');


// ********** EXPRESS APP
const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(cors(CORS_OPTIONS));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use(express.static(APP_CWD + '/public'));
app.use('/images', express.static(APP_CWD + '/images'));

const SESSION_OPTIONS = {secret: 'sessionSecret', resave: false, saveUninitialized: false, store: sessionStore};
app.use(session(SESSION_OPTIONS));

app.use(csrfProtection);
app.use(flash());

app.use(sessionController.startSession);
app.use(sessionController.findUserSession);

app.use(homeRoutes);
app.use(authRoutes);
app.use(userRoutes);
app.use(storeRoutes);

app.use('/', errorController.get404View);

app.use((error, req, res, next) => {
  res.status(500).render('error/500View', {
    pageTitle:        'Error',
    path:             '/500',
    isAuthenticated:  req.session.isLoggedIn,
    error:            error
  });
});


// ********** START SERVER
console.log('Started Server (Port: ' + PORT + ')');
mongoose.connect(MONGODB_CONNECTION_STRING, MONGODB_OPTIONS).then(result => {
  console.log('Started MongoDB');
  authController.startSendGrid();
  app.listen(PORT);
})
.catch(err => {
  console.log('mongoose.connect ERROR: ', err);
});
