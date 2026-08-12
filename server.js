const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

let players = {};

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    let playerNumber = Object.keys(players).length === 0 ? 1 : 2;
    players[socket.id] = { id: socket.id, number: playerNumber, x: playerNumber === 1 ? 100 : 500, y: 200 };

    socket.emit('playerAssign', { number: playerNumber, id: socket.id });
    io.emit('updatePlayers', players);

    socket.on('playerState', (data) => {
        if (players[socket.id]) {
            players[socket.id] = { ...players[socket.id], ...data };
            socket.broadcast.emit('enemyState', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
