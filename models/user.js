const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');


const UserSchema = new mongoose.Schema({
    
    name: {
        type: String,
        require: true,
    },
    email: {
        type: String,
        unique: true,
        require: true,
        lowercase: true,
    },
    password: {
        type: String,
        require: true,
        select: false,
    },
    createdAt: {
        type: Date,
        default: diminuir_hora_date_now(3)

    },
    photoUrl: {
        type: String,
        default: 'https://res.cloudinary.com/dcqrqv8op/image/upload/v1690175525/fotos_usuarios_grupo_do_ben/1361728_uc4n8n.png',
    }
})

function diminuir_hora_date_now(horas) {
    return Date.now() - horas * 3600000; // 3 hours in milliseconds
}
const User = mongoose.model('user', UserSchema);
module.exports = User;