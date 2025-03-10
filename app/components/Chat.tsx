'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/app/context/SocketContext';
import { Message } from '@/app/types/room';

interface ChatProps {
    roomId: string;
}

export default function Chat({ roomId }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [userName] = useState(`User${Math.floor(Math.random() * 1000)}`);
    const socket = useSocket();
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (message: Omit<Message, 'timestamp'>) => {
            setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
        };

        socket.on('receive_message', handleMessage);
        return () => {
            socket.off('receive_message', handleMessage);
        };
    }, [socket]);

    useEffect(() => {    
        const fetchChatHistory = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
                const response = await fetch(`${apiUrl}/chat/${roomId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                if (data.messages) {
                    setMessages(data.messages.map((msg: any) => ({
                        ...msg,
                        timestamp: new Date(msg.created_at || Date.now())
                    })));
                }
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatHistory();
    }, [roomId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !newMessage.trim()) return;

        socket.emit('send_message', {
            roomId,
            message: newMessage,
            sender: userName
        });
        setNewMessage('');
    };

    return (
        <div className="h-full flex flex-col bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-700">
                <h2 className="text-gray-200 font-semibold text-sm sm:text-base">Chat</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="text-center text-gray-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400">No messages yet</div>
                ) : (
                    <>
                        {messages.map((message, i) => (
                            <div key={i} className="group">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-medium text-indigo-400">
                                        {message.sender}
                                    </span>
                                    <span className="text-xs text-gray-500 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {message.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300 break-words">{message.message}</p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t border-gray-700">
                <div className="flex flex-col gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Type a message..."
                    />
                    <button
                        type="submit"
                        className="w-full py-1.5 sm:py-2 bg-indigo-600 text-sm text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}