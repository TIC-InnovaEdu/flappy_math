const mongoose = require('mongoose');

// Definir el esquema del usuario
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Asegura que el nombre de usuario sea único
        trim: true, // Elimina espacios en blanco al inicio y al final
    },
    score: {
        type: Number,
        default: 0, // Valor inicial para la puntuación
    },
});

// Crear el modelo de usuario
const User = mongoose.model('User', userSchema);

module.exports = User;
