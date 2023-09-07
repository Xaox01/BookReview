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
const flash = require('connect-flash');
const TelegramBot = require('node-telegram-bot-api');
const botToken = '6513166210:AAHj6_tmrF-p8AqSPYHzgCeUkBaSIcCkf4o';
const bot = new TelegramBot(botToken, { polling: false });




const app = express();

mongoose.connect('mongodb+srv://studiocrystalgames06:admin@cluster0.qvv9ldl.mongodb.net/?retryWrites=true&w=majority');

mongoose.connection.on('error', console.error.bind(console, 'Błąd połączenia z MongoDB:'));
mongoose.connection.once('open', () => {
  console.log('Połączono z bazą danych MongoDB');
});

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


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
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

const sessionStore = new connectMongoDBSession({
  uri: 'mongodb+srv://studiocrystalgames06:admin@cluster0.qvv9ldl.mongodb.net/?retryWrites=true&w=majority',
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
    const books = await Book.find({}, 'title author coverImage createdAt updatedAt'); // Dodaj 'createdAt' i 'updatedAt' do zapytania
    const username = req.user ? req.user.username : null;
    const email = req.user ? req.user.email : null;
    res.render('index', { books, username, email });
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
  res.render('login', { messages: req.flash('error') }); // Przekazywanie komunikatów flash jako danych
});

app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next(); // Jeśli użytkownik jest zalogowany, kontynuuj żądanie
  }
  res.redirect('/login'); // Jeśli użytkownik nie jest zalogowany, przekieruj go na stronę logowania
}


app.get('/profile', ensureAuthenticated, (req, res) => {
  // Tutaj możesz dodać logikę, aby pobrać informacje o użytkowniku, jeśli są potrzebne
  const username = req.user ? req.user.username : ''; // Pobieramy nazwę użytkownika z sesji
  const email = req.user ? req.user.email : ''; // Pobieramy adres e-mail z sesji
  res.render('profile', { username, email }); // Przekazujemy nazwę użytkownika i adres e-mail do widoku "profile"
});

app.get('/register', (req, res) => {
  res.render('register', { messages: req.flash('error') }); // Przekazujemy komunikaty flash jako dane
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      req.flash('error', 'Nazwa użytkownika jest już zajęta');
      return res.redirect('/register');
    }

    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      req.flash('error', 'Adres e-mail jest już używany');
      return res.redirect('/register');
    }

    await User.create({ username, email, password });
    req.flash('success', 'Rejestracja zakończona pomyślnie. Możesz się teraz zalogować.');
    res.redirect('/login');

    // Wysłanie wiadomości na Telegram
    const registrationMessage = `
Nowy użytkownik zarejestrował się:
- Nazwa użytkownika: ${username}
- Adres e-mail: ${email}
`;
    const chatId = '1997555641'; // Identyfikator czatu, do którego chcesz wysłać wiadomość

    sendTelegramMessage(bot, chatId, registrationMessage);

  } catch (error) {
    console.error(error);
    req.flash('error', 'Wystąpił błąd podczas rejestracji');
    res.redirect('/register');
  }
});

// Funkcja do wysyłania wiadomości na Telegram
function sendTelegramMessage(bot, chatId, message) {
  bot.sendMessage(chatId, message)
    .then(() => {
      console.log('Wiadomość na Telegramie została wysłana.');
    })
    .catch((error) => {
      console.error('Błąd podczas wysyłania wiadomości na Telegramie:', error);
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Aplikacja jest dostępna pod adresem http://localhost:${PORT}`);
});
