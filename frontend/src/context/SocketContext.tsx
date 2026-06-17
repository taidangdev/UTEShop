import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { getAccessToken } from '../services/authSession';
import {
    fetchNotificationsApi,
    markAsReadApi,
    markAllAsReadApi
} from '../services/notificationApi';
import type { AppNotification } from '../types/notification';
import { useNotification } from './NotificationContext';

interface SocketContextProps {
    socket: Socket | null;
    notifications: AppNotification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const user = useSelector((state: RootState) => state.auth.user);
    const { showToast } = useNotification();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const socketRef = useRef<Socket | null>(null);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const data = await fetchNotificationsApi(40, 0);
            setNotifications(data.rows || []);
            const unread = (data.rows || []).filter((n) => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('❌ Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await markAsReadApi(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('❌ Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await markAllAsReadApi();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('❌ Failed to mark all notifications as read:', error);
        }
    };

    // Quản lý kết nối Socket.io
    useEffect(() => {
        const token = getAccessToken();
        if (user && token) {
            console.log('🔌 Connecting socket client...');
            // Connect to server socket
            const newSocket = io('http://localhost:3000', {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('✅ Connected to socket server with id:', newSocket.id);
                // Load notifications history immediately
                fetchNotifications();
            });

            newSocket.on('new_notification', (notification: AppNotification) => {
                console.log('🔔 Received new realtime notification:', notification);
                
                // Cập nhật danh sách thông báo
                setNotifications((prev) => [notification, ...prev]);
                
                // Tăng số lượng tin chưa đọc
                setUnreadCount((prev) => prev + 1);

                // Hiển thị popup toast toàn cục
                showToast(notification.content, notification.type, { title: notification.title });
            });

            newSocket.on('connect_error', (err) => {
                console.error('❌ Socket connection error:', err.message);
            });

            return () => {
                console.log('🔌 Disconnecting socket client...');
                newSocket.disconnect();
                socketRef.current = null;
                setSocket(null);
            };
        } else {
            // Clear notifications when logged out
            setNotifications([]);
            setUnreadCount(0);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider
            value={{
                socket,
                notifications,
                unreadCount,
                fetchNotifications,
                markAsRead,
                markAllAsRead
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};
