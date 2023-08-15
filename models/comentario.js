const mongoose = require('mongoose');
const { Schema } = mongoose;

const comentarioSchema = new Schema({
  usuario: {
    type: String,
    ref: 'user',
    required: true,
  },
  conteudo: {
    type: String,
    required: true,
  },
  dataCriacao: {
    type: Date,
    default: Date.now,
  },
  avaliacao: {
    type: mongoose.Decimal128,
    min: 1,
    max: 5,
    required: true,
  },
});

const Comentario = mongoose.model('Comentario', comentarioSchema);

module.exports = Comentario;
