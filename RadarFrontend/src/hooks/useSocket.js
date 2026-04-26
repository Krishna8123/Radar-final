import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (channels = []) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            if (channels.length > 0) {
                socket.emit('subscribe', { channels });
            }
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            if (socket) socket.disconnect();
        };
    }, [JSON.stringify(channels)]);

    const on = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);

    const emit = useCallback((event, data) => {
        if (socketRef.current) {
            socketRef.current.emit(event, data);
        }
    }, []);

    return { isConnected, on, emit, socket: socketRef.current };
};
