let globalNotification: any = null;

export const setNotification = (notification: any) => {
  globalNotification = notification;
};

export const showError = (message: string, description?: string) => {
  if (globalNotification) {
    globalNotification.error({
      message,
      description,
      placement: 'bottomRight',
      duration: 4,
    });
  }
};

export const showSuccess = (message: string, description?: string) => {
  if (globalNotification) {
    globalNotification.success({
      message,
      description,
      placement: 'bottomRight',
      duration: 4,
    });
  } else {
    console.error('Notification not initialized:', message, description);
  }
};
