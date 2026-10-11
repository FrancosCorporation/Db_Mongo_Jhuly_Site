const crypto = require('node:crypto');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  photoUrl: {
    type: String,
    default: 'https://res.cloudinary.com/dcqrqv8op/image/upload/v1690175525/fotos_usuarios_grupo_do_ben/1361728_uc4n8n.png',
  },
});

module.exports = mongoose.model('user', userSchema);
