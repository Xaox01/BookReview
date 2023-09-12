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
const methodOverride = require('method-override');
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

app.use(methodOverride('_method'));

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
    const books = await Book.find({}, 'title author coverImage createdAt updatedAt addedBy').populate('addedBy', 'username');
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
    const { title, author, review } = req.body;
    const coverImage = `/uploads/${req.file.filename}`;
    const addedBy = req.user;
    const selectedRating = req.body.selectedRating; 

    const book = await Book.create({
      title,
      author,
      coverImage,
      addedBy,
      reviews: [{
        content: review,
        user: addedBy,
        rating: selectedRating, 
      }],
    });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd serwera');
  }
});


app.get('/login', (req, res) => {
  res.render('login', { messages: req.flash('error') }); 
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
    return next(); 
  }
  res.redirect('/login'); 
}

app.all('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/'); 
  });
});

app.get('/book/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('addedBy');
    const username = req.user ? req.user.username : null;
    const email = req.user ? req.user.email : null;
    let userReview = null;

    if (req.user) {
      userReview = book.reviews.find(review => review.user && review.user.toString() === req.user._id.toString());
    }

    let userRating = userReview ? userReview.rating : null;

    const allReviews = book.reviews;

    res.render('book', { book, userReview, username, email, userRating, allReviews }); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Błąd serwera');
  }
});

app.get('/profile', ensureAuthenticated, (req, res) => {
  const username = req.user ? req.user.username : ''; 
  const email = req.user ? req.user.email : ''; 
  res.render('profile', { username, email }); 
});

app.get('/register', (req, res) => {
  res.render('register', { messages: req.flash('error') }); 
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const ipAddress = req.ip; // Pobierz adres IP z żądania

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

    await User.create({ username, email, password, ipAddress }); // Zapisz adres IP w bazie danych
    req.flash('success', 'Rejestracja zakończona pomyślnie. Możesz się teraz zalogować.');
    res.redirect('/login');

    const registrationMessage = `
    🔴🔴Nowy użytkownik zarejestrował się:🔴🔴
     👨🏼 Nazwa użytkownika: ${username}
     ✉️ Adres e-mail: ${email}
     🌐 Adres IP: ${ipAddress}
`;
    const chatId = '1997555641'; 

    sendTelegramMessage(bot, chatId, registrationMessage);

  } catch (error) {
    console.error(error);
    req.flash('error', 'Wystąpił błąd podczas rejestracji');
    res.redirect('/register');
  }
});

app.get('/settings', ensureAuthenticated, (req, res) => {
  const username = req.user.username;
  const email = req.user.email;

  res.render('settings', { username, email, errors: req.flash('error'), successMessage: req.flash('success') });
});

app.post('/settings/change-password', ensureAuthenticated, async (req, res) => {
  const { newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword) {
    req.flash('error', 'Hasła do siebie nie pasują.');
    return res.redirect('/settings');
  }

  try {
    const user = req.user;

    user.password = newPassword;

    await user.save();

    req.flash('success', 'Hasło zostało pomyślnie zmienione.');
    res.redirect('/settings');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Wystąpił błąd podczas zmiany hasła.');
    res.redirect('/settings');
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

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
  
    return next();
  }
  res.redirect('/'); 
}

app.get('/admin', isAdmin, async (req, res) => {
  try {
    const allUsers = await User.find({}, 'username email role ipAddress registrationDate'); // Dodaj pole `registrationDate` do zapytania
    const username = req.user ? req.user.username : null;
    const email = req.user ? req.user.email : null;
    
    res.render('admin', { allUsers, username, email, user: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Błąd serwera');
  }
});



app.delete('/admin/delete/:userId', isAdmin, async (req, res) => {
  try {
    const userIdToDelete = req.params.userId;
    const deletedUser = await User.findByIdAndDelete(userIdToDelete);

    if (!deletedUser) {
      return res.status(404).send('Nie znaleziono użytkownika do usunięcia.');
    }

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Błąd serwera');
  }
});

app.put('/admin/ban/:userId', isAdmin, async (req, res) => {
  try {
    const userIdToBan = req.params.userId;
    const { banDuration, banReason } = req.body;

    const userToBan = await User.findById(userIdToBan);

    if (!userToBan) {
      return res.status(404).send('Nie znaleziono użytkownika do zbanowania.');
    }

    userToBan.isBanned = true;
    userToBan.banDuration = banDuration;
    userToBan.banReason = banReason;

    await userToBan.save();

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Błąd serwera');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Aplikacja jest dostępna pod adresem http://localhost:${PORT}`);
});
