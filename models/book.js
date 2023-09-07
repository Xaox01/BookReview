const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  coverImage: String,
}, {
  timestamps: true, // Dodaj opcję timestamps
});

module.exports = mongoose.model('Book', bookSchema);