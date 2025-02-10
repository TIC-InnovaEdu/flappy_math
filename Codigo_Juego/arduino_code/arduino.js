const express = require('express');
const path = require('path');
const { SerialPort, ReadlineParser } = require('serialport');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Configurar conexión con el Arduino (Cambia COM4 si usas otro puerto)
const port = new SerialPort({
    path: 'COM4',
    baudRate: 115200
});
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Tiempos de encendido (AJUSTABLES)
const greenBlinkTime = 100;  // Tiempo de parpadeo del LED verde
const redBlinkTime = 2500;   // Tiempo que el LED rojo permanece encendido

app.use(express.static(path.join(__dirname, '../')));

io.on('connection', (socket) => {
    console.log('🔗 Cliente conectado');

    socket.on('flash', (type) => {
        if (type === 'success') {
            port.write('G\n'); // Encender LED verde y buzzer
            port.write('B\n'); // Sonido del buzzer en acierto
            setTimeout(() => {
                port.write('O\n'); // Apagar LED verde y buzzer
            }, greenBlinkTime);
        } 
        else if (type === 'error') {
            port.write('R\n'); // Encender LED rojo y buzzer
            port.write('X\n'); // Sonido del buzzer en error
            setTimeout(() => {
                port.write('O\n'); // Apagar LED rojo y buzzer
            }, redBlinkTime);
        }
    });

    socket.on('resetGame', () => {
        console.log('🔄 Reiniciando pantalla LCD en Arduino...');
        port.write('Z\n', (err) => {
            if (err) {
                console.error('❌ Error al enviar Z:', err.message);
            } else {
                console.log('✅ Comando Z enviado correctamente al Arduino');
            }
        });
    });

    // Escuchar respuestas del Arduino (opcional)
    parser.on('data', (data) => {
        console.log('📩 Arduino dice:', data);
        socket.emit('arduinoResponse', data.trim()); // Enviar datos al cliente
    });
});

// Iniciar el servidor en el puerto 3000
http.listen(3000, () => {
    console.log('🚀 Servidor escuchando en *:3000');
});