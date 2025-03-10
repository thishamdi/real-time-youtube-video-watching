'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/app/context/SocketContext';
import VideoPlayer from '@/app/components/VideoPlayer';
import Chat from '@/app/components/Chat';
import { RoomState } from '@/app/types/room';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const socket = useSocket();
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', id);

    const handleRoomJoined = (state: RoomState) => {
      setRoomState(state);
    };

    socket.on('room_joined', handleRoomJoined);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.emit('leave_room', id);
    };
  }, [socket, id]);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/')}
                className="text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-gray-300 text-sm hidden sm:block">
                Room ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{id}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-2 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)]">
          {/* Video Section */}
          <div className="lg:flex-1 h-[40vh] lg:h-full">
            <div className="h-full rounded-xl overflow-hidden">
              <VideoPlayer roomId={id} initialState={roomState} />
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:w-[400px] h-[calc(60vh-120px)] lg:h-full">
            <Chat roomId={id} />
          </div>
        </div>
      </main>
    </div>
  );
}