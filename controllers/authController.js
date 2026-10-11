const crypto = require('node:crypto');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Comentario = require('../models/comentario');
const authMiddleware = require('./authMiddleware');
const uploadPhoto = require('./upload_fotos');
const { jwtAudience, jwtIssuer, jwtSecret } = require('../config/env');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const dummyPasswordHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => callback(null, acceptedImageTypes.has(file.mimetype)),
});

router.post('/register', registerLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!emailPattern.test(email) || email.length > 254 || password.length < 8 || password.length > 128 || !name || name.length > 100) {
    return res.status(422).json({ error: 'E-mail, senha ou nome inválido.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    await new User({ email, password: hashedPassword, name }).save();
    return res.status(201).json({ message: 'Usuário registrado com sucesso.' });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Usuário já existe.' });
    }

    console.error('User registration failed:', error?.name ?? 'UnknownError');
    return res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  try {
    const user = email ? await User.findOne({ email }).select('+password') : null;
    const passwordHash = user?.password ?? dummyPasswordHash;
    const validPassword = await bcrypt.compare(password || 'invalid-password', passwordHash);

    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { userId: String(user._id), sub: String(user._id) },
      jwtSecret,
      { algorithm: 'HS256', audience: jwtAudience, expiresIn: '2h', issuer: jwtIssuer },
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Login failed:', error?.name ?? 'UnknownError');
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

router.post('/upload_foto_profile', authMiddleware, photoUpload.single('fotoPerfil'), async (req, res) => {
  if (!req.file) {
    return res.status(415).json({ error: 'Envie uma imagem JPEG, PNG ou WebP de até 5 MB.' });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { fileTypeFromBuffer } = await import('file-type');
    const detectedType = await fileTypeFromBuffer(req.file.buffer);
    if (!detectedType || !acceptedImageTypes.has(detectedType.mime)) {
      return res.status(415).json({ error: 'O conteúdo do arquivo não é uma imagem JPEG, PNG ou WebP.' });
    }

    const photoUrl = await uploadPhoto(req.file.buffer);
    user.photoUrl = photoUrl;
    await user.save();
    return res.status(200).json({ message: 'Upload da foto de perfil concluído.' });
  } catch (error) {
    if (error?.code === 'CLOUDINARY_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'O serviço de imagens não está configurado.' });
    }

    console.error('Profile photo upload failed:', error?.name ?? 'UnknownError');
    return res.status(502).json({ error: 'Não foi possível salvar a foto de perfil.' });
  }
});

router.post('/comentarios', authMiddleware, async (req, res) => {
  const conteudo = typeof req.body?.conteudo === 'string' ? req.body.conteudo.trim() : '';
  const rawRating = req.body?.avaliacao;
  const rating = typeof rawRating === 'string' ? Number(rawRating.replace(',', '.')) : rawRating;

  if (!conteudo || conteudo.length > 2000) {
    return res.status(400).json({ error: 'O conteúdo é obrigatório e deve ter até 2000 caracteres.' });
  }

  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'A avaliação deve ser um número entre 1 e 5.' });
  }

  try {
    const userExists = await User.exists({ _id: req.user.userId });
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const comentario = await new Comentario({
      usuario: req.user.userId,
      conteudo,
      avaliacao: mongoose.Types.Decimal128.fromString(String(rating)),
    }).save();

    return res.status(201).json(comentario);
  } catch (error) {
    console.error('Comment creation failed:', error?.name ?? 'UnknownError');
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/comentarios', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);

  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'Use page >= 1 e limit entre 1 e 50.' });
  }

  try {
    const comentarios = await Comentario.find()
      .sort({ dataCriacao: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('usuario', 'name photoUrl')
      .lean();

    const feed = comentarios
      .filter((comentario) => comentario.usuario)
      .map((comentario) => ({
        nome: comentario.usuario.name,
        comentario: comentario.conteudo,
        avaliacao: comentario.avaliacao.toString(),
        foto: comentario.usuario.photoUrl,
      }));

    return res.status(200).json(feed);
  } catch (error) {
    console.error('Comment listing failed:', error?.name ?? 'UnknownError');
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = (app) => app.use(router);
