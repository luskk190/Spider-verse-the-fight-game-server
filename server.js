const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Guarda as salas ativas: { "CODIGO": { players: [socketId1, socketId2], mode: "pvp" } }
let rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    // CRIAR SALA
    socket.on('createRoom', (data) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [socket.id],
            mode: data.mode || 'pvp'
        };

        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('roomCreated', {
            roomCode: roomCode,
            playerNumber: 1
        });
        console.log(`Sala ${roomCode} criada pelo jogador 1`);
    });

    // ENTRAR EM UMA SALA EXISTENTE
    socket.on('joinRoom', (data) => {
        const roomCode = data.roomCode.toUpperCase();
        const room = rooms[roomCode];

        if (!room) {
            socket.emit('errorMsg', 'Sala não encontrada!');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('errorMsg', 'Esta sala já está cheia!');
            return;
        }

        room.players.push(socket.id);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('roomJoined', {
            roomCode: roomCode,
            playerNumber: 2
        });

        // Avisa ambos que a partida pode começar
        io.to(roomCode).emit('gameStart', { mode: room.mode });
        console.log(`Jogador 2 entrou na sala ${roomCode}`);
    });

    // TRANSMITE A MOVIMENTAÇÃO APENAS PARA A MESMA SALA
    socket.on('playerState', (data) => {
        if (socket.roomCode) {
            socket.to(socket.roomCode).emit('enemyState', data);
        }
    });

    // DESCONEXÃO
    socket.on('disconnect', () => {
        if (socket.roomCode && rooms[socket.roomCode]) {
            const room = rooms[socket.roomCode];
            room.players = room.players.filter(id => id !== socket.id);
            socket.to(socket.roomCode).emit('playerLeft');

            if (room.players.length === 0) {
                delete rooms[socket.roomCode];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
