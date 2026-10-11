const cloudinary = require('cloudinary').v2;

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_USER;
  const apiKey = process.env.CLOUDINARY_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Cloudinary is not configured.');
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

function uploadPhoto(buffer) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'fotos_usuarios_grupo_do_ben', resource_type: 'image' },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url) {
          return reject(new Error('Cloudinary returned no secure image URL.'));
        }

        return resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
}

module.exports = uploadPhoto;
