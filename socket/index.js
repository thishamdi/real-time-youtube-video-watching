import { registerSocketEvents } from './events.js';

export const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);
        registerSocketEvents(io, socket);

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};