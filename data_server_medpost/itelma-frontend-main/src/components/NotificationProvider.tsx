import React, { useEffect } from 'react';
import { App } from 'antd';
import { setNotification } from '../services/notificationService';

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notification } = App.useApp();

  useEffect(() => {
    setNotification(notification);
  }, [notification]);

  return <>{children}</>;
};

export default NotificationProvider;
