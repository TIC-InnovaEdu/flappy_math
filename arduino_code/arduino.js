const express = require('express');
const path = require('path');
const { SerialPort } = require('serialport');  // Importación correcta

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = new SerialPort({ 
    path: 'COM4',  // Asegúrate de que 'COM4' sea el puerto correcto
    baudRate: 9600
});

// Sirve la carpeta raíz como pública
app.use(express.static(path.join(__dirname, '../')));

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('flash', (type) => {
        if (type === 'success') {
            port.write('G');  // Envía el comando para encender el LED verde
        } else if (type === 'error') {
            port.write('R');  // Envía el comando para encender el LED rojo
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
