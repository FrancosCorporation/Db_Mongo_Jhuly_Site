const cloudinary = require('cloudinary').v2;
const cloudinary_user = process.env.CLOUDINARY_USER;
const cloudinary_secret = process.env.CLOUDINARY_SECRET;
const cloudinary_key = process.env.CLOUDINARY_KEY;

// Configuração do Cloudinary com suas credenciais
cloudinary.config({
  cloud_name: cloudinary_user,
  api_key: cloudinary_key,
  api_secret: cloudinary_secret
});

// Função para fazer o upload da foto no Cloudinary e retornar a URL
async function uploadPhoto(file) {
  try {
    // Use o método .upload() do Cloudinary para fazer o upload da foto
    const result = await cloudinary.uploader.upload(file, {
      folder: 'fotos_usuarios_grupo_do_ben' // Pasta no Cloudinary para armazenar as fotos dos usuários
    });

    // A URL pública da foto estará em result.secure_url
    return result.secure_url;
  } catch (error) {
    console.error('Erro ao fazer o upload da foto:', error);
    throw error;
  }
}

module.exports = uploadPhoto;