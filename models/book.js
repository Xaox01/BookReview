const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  coverImage: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true, // Dodaj opcję timestamps
});

module.exports = mongoose.model('Book', bookSchema);