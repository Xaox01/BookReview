const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 4,
    maxlength: 25,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
  },
  ipAddress: String,
  isBanned: {
    type: Boolean,
    default: false,
  },
  banDuration: {
    type: Number,
    default: 0,
  },
  banReason: String,
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  profilePicture: String,
  description: String, 
});


userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(user.password, salt);
  user.password = hash;
  next();
});

module.exports = mongoose.model('User', userSchema);
