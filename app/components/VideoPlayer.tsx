'use client';

import { useSocket } from '@/app/context/SocketContext';
import { RoomState } from '@/app/types/room';
import { useEffect, useState, useRef } from 'react';
import UnifiedVideoPlayer from './UnifiedVideoPlayer';
import { SyncUpdate } from '../types/video';

interface VideoPlayerProps {
    roomId: string;
    initialState: RoomState;
}

export default function VideoPlayer({ roomId, initialState }: VideoPlayerProps) {
    const socket = useSocket();
    const [isPlaying, setIsPlaying] = useState(initialState.isPlaying);
    const [currentTime, setCurrentTime] = useState(initialState.currentTime);
    const [isUserSeeking, setIsUserSeeking] = useState(false);
    const lastUpdateTime = useRef<number>(Date.now());

    useEffect(() => {
        if (!socket) return;

        const handleSyncUpdate = ({ currentTime, isPlaying }: SyncUpdate) => {
            setCurrentTime(currentTime);
            setIsPlaying(isPlaying);
        };

        const handleForceSync = ({ currentTime, isPlaying, action }: SyncUpdate & { action?: string }) => {
            setCurrentTime(currentTime);
            setIsPlaying(isPlaying);
        };

        const handleUserJoined = () => {
            // Pause video when new user joins
            setIsPlaying(false);
            console.log('New user joined, pausing video...');
        };

        const handleCheckReady = () => {
            // Confirm this client is ready to play
            socket.emit('ready_confirmed', roomId);
        };

        socket.on('sync_update', handleSyncUpdate);
        socket.on('force_sync', handleForceSync);
        socket.on('user_joined', handleUserJoined);
        socket.on('check_ready', handleCheckReady);

        // Request initial sync when component mounts
        socket.emit('request_sync', roomId);

        return () => {
            socket.off('sync_update', handleSyncUpdate);
            socket.off('force_sync', handleForceSync);
            socket.off('user_joined', handleUserJoined);
            socket.off('check_ready', handleCheckReady);
        };
    }, [socket, roomId]);

    const handleTimeUpdate = (time: number, playing: boolean) => {
        if (!socket || isUserSeeking) return;

        // Throttle updates to prevent flooding
        const now = Date.now();
        if (now - lastUpdateTime.current > 1000) {
            lastUpdateTime.current = now;
            socket.emit('time_update', roomId, time, playing);
        }
    };

    return (
        <div className="bg-black rounded-lg overflow-hidden">
            <UnifiedVideoPlayer
                url={initialState.videoUrl}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onPlay={(time) => {
                    setIsPlaying(true);
                    socket?.emit('play', roomId, time);
                }}
                onPause={(time) => {
                    setIsPlaying(false);
                    socket?.emit('pause', roomId, time);
                }}
                onSeek={(time) => {
                    setCurrentTime(time);
                    socket?.emit('seek', roomId, time);
                }}
                onTimeUpdate={handleTimeUpdate}
            />
        </div>
    );
}