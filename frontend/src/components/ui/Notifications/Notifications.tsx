import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Notifications.module.scss';

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    autoClose?: boolean;
    duration?: number;
}

interface NotificationsProps {
    notifications: Notification[];
    dispatch: React.Dispatch<any>;
}

export const Notifications: React.FC<NotificationsProps> = ({
    notifications,
    dispatch,
}) => {
    useEffect(() => {
        // Auto-close notifications
        notifications.forEach((notification) => {
            if (notification.autoClose !== false) {
                const timer = setTimeout(() => {
                    dispatch({
                        type: 'REMOVE_NOTIFICATION',
                        payload: notification.id,
                    });
                }, notification.duration || 5000);

                return () => clearTimeout(timer);
            }
        });
    }, [notifications, dispatch]);

    const handleClose = (id: string) => {
        dispatch({
            type: 'REMOVE_NOTIFICATION',
            payload: id,
        });
    };

    if (notifications.length === 0) return null;

    return createPortal(
        <div className={styles.container}>
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`${styles.notification} ${styles[notification.type]}`}
                    role="alert"
                >
                    <div className={styles.icon}>
                        {getIconForType(notification.type)}
                    </div>
                    <div className={styles.message}>{notification.message}</div>
                    <button
                        className={styles.closeButton}
                        onClick={() => handleClose(notification.id)}
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                    {notification.autoClose !== false && (
                        <div
                            className={styles.progressBar}
                            style={{
                                animationDuration: `${notification.duration || 5000}ms`,
                            }}
                        />
                    )}
                </div>
            ))}
        </div>,
        document.body
    );
};

function getIconForType(type: Notification['type']): JSX.Element {
    switch (type) {
        case 'info':
            return (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
            );
        case 'success':
            return (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
            );
        case 'warning':
            return (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
            );
        case 'error':
            return (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            );
    }
}
