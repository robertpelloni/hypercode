import { useState, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/assets/icon.png', // Assuming we have an icon
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [permission]);

  return {
    permission,
    requestPermission,
    sendNotification
  };
}
