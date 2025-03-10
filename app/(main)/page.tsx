'use client';

import { useState } from 'react';
import { useSocket } from '@/app/context/SocketContext';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';

export default function HomePage() {
  const router = useRouter();
  const socket = useSocket();
  const [videoUrl, setVideoUrl] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const validateYouTubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
  };

  const handleCreateRoom = () => {
    setError('');
    if (!socket) {
      setError('Connection error. Please try again.');
      return;
    }
    if (!validateYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsCreating(true);
    socket.emit('create_room', videoUrl);
    socket.on('room_created', (id: string) => {
      router.push(`/room/${id}`);
    });
    socket.on('error', (message: string) => {
      setError(message);
      setIsCreating(false);
    });
  };

  const handleJoinRoom = () => {
    setError('');
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Video Sync</h1>
          <p className="mt-3 text-gray-400">Watch YouTube videos together in real-time</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://youtube.com/..."
            />
            <Button
              onClick={handleCreateRoom}
              isLoading={isCreating}
              className="mt-3 bg-indigo-600 hover:bg-indigo-700"
            >
              Create Room
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">or join existing</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room ID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter room ID..."
            />
            <Button
              onClick={handleJoinRoom}
              variant="secondary"
              className="mt-3 bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
            >
              Join Room
            </Button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}