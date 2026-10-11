const mongoose = require('mongoose');
const { mongoUri } = require('./env');

let connectionPromise;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 0) {
    connectionPromise = undefined;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  await connectionPromise;
  return mongoose;
}

module.exports = connectToDatabase;
