import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.tsx';
import toast from 'react-hot-toast';

interface Notification {
  type: string;
  content: string;
  created_at: string;
}

interface NotificationContextType {
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (token && user) {
      const newSocket = io(window.location.origin);
      
      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('join', user.id);
      });

      newSocket.on('notification', (notification: Notification) => {
        toast.success(notification.content, {
          duration: 5000,
          position: 'top-right',
          icon: '🔔',
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token, user]);

  return (
    <NotificationContext.Provider value={{ socket }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
