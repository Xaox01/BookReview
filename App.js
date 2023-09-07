const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Book = require('./models/book');
const User = require('./models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const expressSession = require('express-session');
const connectMongoDBSession = require('connect-mongodb-session')(expressSession);
const bodyParser = require('body-parser');
const flash = require('connect-flash'); // Dodane connect-flash

const app = express();

mongoose.connect('mongodb+srv://studiocrystalgames06:admin@cluster0.qvv9ldl.mongodb.net/?retryWrites=true&w=majority');


mongoose.connection.on('error', console.error.bind(console, 'Błąd połączenia z MongoDB:'));
mongoose.connection.once('open', () => {
  console.log('Połączono z bazą danych MongoDB');
});

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dodane body-parser
app.use(bodyParser.urlencoded({ extended: true }));

app.use(flash());


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Konfiguracja passport
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false, { message: 'Nieprawidłowa nazwa użytkownika lub hasło' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Nieprawidłowa nazwa użytkownika lub hasło' });
      }
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

const sessionStore = new connectMongoDBSession({
  uri: 'mongodb+srv://studiocrystalgames06:admin@cluster0.qvv9ldl.mongodb.net/?retryWrites=true&w=majority  ', // Zaktualizuj URI MongoDB
  collection: 'sessions',
});

app.use(
  expressSession({
    secret: 'my-secret-session-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/', async (req, res) => {
  try {
    const books = await Book.find();
    res.render('index', { books });
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd serwera');
  }
});

app.post('/add-book', upload.single('coverImage'), async (req, res) => {
  try {
    const { title, author } = req.body;
    const coverImage = `/uploads/${req.file.filename}`;
    await Book.create({ title, author, coverImage });
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd serwera');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

app.get('/register', (req, res) => {
  res.render('register', { messages: {} }); // Przekazujemy pusty obiekt na początek
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      req.flash('error', 'Nazwa użytkownika jest już zajęta');
      return res.redirect('/register');
    }

    await User.create({ username, password });
    req.flash('success', 'Rejestracja zakończona pomyślnie. Możesz się teraz zalogować.');
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Wystąpił błąd podczas rejestracji');
    res.redirect('/register');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Aplikacja jest dostępna pod adresem http://localhost:${PORT}`);
});
