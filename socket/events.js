import { createRoom, getRoomById, updateVideoState } from '../services/room.service.js';
import { sendMessage } from '../services/chat.service.js';

const SYNC_THRESHOLD = 1; // Tighter sync threshold
const UPDATE_INTERVAL = 1000;
const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

// Add YouTube URL parsing utility
const extractYouTubeVideoId = (url) => {
    let videoId = null;
    
    // Handle youtube.com URLs
    const normalMatch = url.match(/[?&]v=([^&]+)/);
    if (normalMatch) {
        videoId = normalMatch[1];
    }
    
    // Handle youtu.be URLs
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) {
        videoId = shortMatch[1];
    }
    
    // Handle playlist URLs
    if (url.includes('playlist')) {
        const videoMatch = url.match(/[?&]v=([^&]+)/);
        if (videoMatch) {
            videoId = videoMatch[1];
        }
    }

    return videoId;
};

// Helper function for video control events
const handleVideoControl = async (io, socket, roomId, currentTime, action) => {
    try {
        if (!roomId || typeof currentTime !== 'number') {
            console.log('Invalid parameters:', { roomId, currentTime, action });
            return socket.emit('error', 'Invalid video control parameters');
        }

        console.log(`[${action.toUpperCase()}] Room: ${roomId}, Time: ${currentTime}, Playing: ${action === 'play'}`);

        const { data: currentState } = await getRoomById(roomId);
        
        // More aggressive sync for seek actions
        const timeDiff = currentState ? Math.abs(currentState.current_playback_time - currentTime) : 0;
        const shouldSync = action === 'seek' ? timeDiff > 0.5 : timeDiff > SYNC_THRESHOLD;

        if (!currentState || shouldSync || currentState.is_playing !== (action === 'play')) {
            await updateVideoState(roomId, {
                is_playing: action === 'play',
                current_playback_time: currentTime
            });

            // Enhanced sync message
            io.to(roomId).emit('force_sync', {
                currentTime,
                isPlaying: action === 'play',
                action // Include action type for better client handling
            });
        }
    } catch (err) {
        console.error(`Error in ${action} handler:`, err);
        socket.emit('error', `Video ${action} failed`);
    }
};

export const registerSocketEvents = (io, socket) => {
    console.log(`New connection: ${socket.id}`);

    // Room Management
    socket.on('create_room', async (videoUrl) => {
        try {
            if (!YOUTUBE_URL_PATTERN.test(videoUrl)) {
                return socket.emit('error', 'Only YouTube videos are supported');
            }

            // Extract the video ID and create clean URL
            const videoId = extractYouTubeVideoId(videoUrl);
            if (!videoId) {
                return socket.emit('error', 'Invalid YouTube URL');
            }

            // Create clean URL without any extra parameters
            const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
            console.log(`Creating room for video ID: ${videoId}`);

            const { data, error } = await createRoom(cleanUrl);

            if (error || !data) {
                console.error('Room creation failed:', error?.message || 'No data returned');
                return socket.emit('error', 'Room creation failed');
            }

            socket.join(data.id);
            socket.emit('room_created', data.id);
            console.log(`Room created: ${data.id}`);

        } catch (err) {
            console.error('Create room error:', err);
            socket.emit('error', 'Internal server error');
        }
    });

    socket.on('join_room', async (roomId) => {
        try {
            if (!roomId || typeof roomId !== 'string') {
                return socket.emit('error', 'Invalid room ID');
            }

            console.log(`Joining room: ${roomId}`);
            const { data, error } = await getRoomById(roomId);

            if (error || !data) {
                console.error('Room join failed:', error?.message || 'Room not found');
                return socket.emit('error', 'Room not found');
            }

            // First notify others to pause
            socket.to(roomId).emit('user_joined');
            
            // Then update room state
            await updateVideoState(roomId, {
                is_playing: false,
                current_playback_time: data.current_playback_time
            });

            // Then join room and send initial state
            socket.join(roomId);
            socket.emit('room_joined', {
                videoUrl: data.video_url,
                isPlaying: false, // Always start paused
                currentTime: data.current_playback_time
            });

            // Then notify others and pause their playback
            socket.to(roomId).emit('force_sync', {
                currentTime: data.current_playback_time,
                isPlaying: false,
                action: 'join'
            });

            // After a short delay, check if everyone is ready
            setTimeout(() => {
                io.to(roomId).emit('check_ready', {
                    currentTime: data.current_playback_time,
                    wasPlaying: data.is_playing // Pass the previous playing state
                });
            }, 2000);

            console.log(`User ${socket.id} joined ${roomId}`);

        } catch (err) {
            console.error('Join room error:', err);
            socket.emit('error', 'Failed to join room');
        }
    });

    socket.on('player_ready', async (roomId) => {
        try {
            const { data } = await getRoomById(roomId);
            if (data && data.is_playing) {
                io.to(roomId).emit('force_sync', {
                    currentTime: data.current_playback_time,
                    isPlaying: true,
                    action: 'resume'
                });
            }
        } catch (err) {
            console.error('Player ready error:', err);
        }
    });

    // Add ready check handler
    socket.on('ready_confirmed', async (roomId) => {
        try {
            const { data } = await getRoomById(roomId);
            if (data && data.is_playing) {
                // If video was playing before, resume for all
                io.to(roomId).emit('force_sync', {
                    currentTime: data.current_playback_time,
                    isPlaying: true,
                    action: 'resume'
                });
            }
        } catch (err) {
            console.error('Ready confirmation error:', err);
        }
    });

    // Video Controls with state reconciliation
    let lastUpdate = {};
    
    socket.on('time_update', async (roomId, currentTime, isPlaying) => {
        try {
            const now = Date.now();
            
            // Throttle updates per room
            if (!lastUpdate[roomId] || now - lastUpdate[roomId] >= UPDATE_INTERVAL) {
                lastUpdate[roomId] = now;
                
                const { data: currentState } = await getRoomById(roomId);
                
                // Only update if significant change
                if (!currentState || 
                    Math.abs(currentState.current_playback_time - currentTime) > SYNC_THRESHOLD) {
                    
                    await updateVideoState(roomId, {
                        is_playing: isPlaying,
                        current_playback_time: currentTime
                    });
                }
            }
        } catch (err) {
            console.error('Time update error:', err);
        }
    });

    socket.on('play', async (roomId, currentTime) => {
        try {
            await handleVideoControl(io, socket, roomId, currentTime, 'play');
        } catch (err) {
            console.error('Play error:', err);
        }
    });

    socket.on('pause', async (roomId, currentTime) => {
        try {
            await handleVideoControl(io, socket, roomId, currentTime, 'pause');
        } catch (err) {
            console.error('Pause error:', err);
        }
    });

    socket.on('seek', (roomId, currentTime) => {
        console.log('Received seek event:', { roomId, currentTime });
        handleVideoControl(io, socket, roomId, currentTime, 'seek');
    });

    // Add sync check handler
    socket.on('sync_check', async (roomId, currentTime) => {
        try {
            console.log('Sync check:', { roomId, currentTime });
            const { error } = await updateVideoState(roomId, {
                is_playing: true,
                current_playback_time: currentTime
            });

            if (!error) {
                // Broadcast sync time to all other clients
                socket.to(roomId).emit('sync_time', currentTime);
                console.log('Sync broadcast sent to room:', roomId);
            }
        } catch (err) {
            console.error('Sync check error:', err);
        }
    });

    // Add periodic room state broadcast
    socket.on('request_sync', async (roomId) => {
        try {
            const { data } = await getRoomById(roomId);
            if (data) {
                socket.emit('force_sync', {
                    currentTime: data.current_playback_time,
                    isPlaying: data.is_playing
                });
            }
        } catch (err) {
            console.error('Sync request error:', err);
        }
    });

    // Chat System
    socket.on('send_message', async ({ roomId, message, sender }) => {
        try {
            if (!roomId || !message?.trim() || !sender?.trim()) {
                return socket.emit('error', 'Invalid message data');
            }

            console.log(`New message in ${roomId} from ${sender}`);

            const { error } = await sendMessage({
                room_id: roomId,
                message: message.substring(0, 500), // Prevent long messages
                sender: sender.substring(0, 50)
            });

            if (error) {
                console.error('Message save error:', error.message);
                return socket.emit('error', 'Failed to send message');
            }

            io.to(roomId).emit('receive_message', {
                message: message.substring(0, 500),
                sender: sender.substring(0, 50)
            });
            console.log(`Message broadcast in ${roomId}`);

        } catch (err) {
            console.error('Chat error:', err);
            socket.emit('error', 'Message processing failed');
        }
    });

    // Connection cleanup
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
};