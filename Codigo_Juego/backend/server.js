const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

// Crear la aplicación Express
const app = express();

// Usa cors middleware para permitir solicitudes desde cualquier origen
app.use(cors());

// Configurar el puerto
const PORT = process.env.PORT || 5000;

// Middleware para parsear JSON en las solicitudes
app.use(express.json());

// Conectar a MongoDB usando Mongoose
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Error connecting to MongoDB:", err));

// Definir una ruta de prueba
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const User = require('./models/user'); // Importar el modelo de usuario

// Ruta para registrar un nuevo usuario
app.post('/api/register', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: "Username is required" });
    }

    try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Crear un nuevo usuario
        const newUser = new User({ username });
        await newUser.save();

        console.log('User registered:', newUser); // <- Aquí se imprime la información del usuario

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


// Ruta para obtener los usuarios ordenados por puntaje
app.get('/api/users', async (req, res) => {
    try {
        // Encuentra los usuarios y ordénalos por puntaje en orden descendente, limitando a los 5 mejores
        const users = await User.find().sort({ score: -1 }).limit(5);
        res.status(200).json(users); // Devuelve los usuarios en formato JSON
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor', error });
    }
});




// Ruta para actualizar la puntuación de un usuario
app.put('/api/users/:username/score', async (req, res) => {
    const { username } = req.params;
    const { score } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Solo actualizar si el nuevo puntaje es mayor que el actual
        if (score > user.score) {
            user.score = score;
            await user.save();
        }

        res.status(200).json({ message: 'Score updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

