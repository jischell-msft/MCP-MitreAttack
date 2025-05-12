import React, { useEffect } from 'react';
import { Notification } from '../../../context/AppContext';
import { AppAction } from '../../../context/AppContext';
import styles from './Notifications.module.scss';

interface NotificationsProps {
    notifications: Notification[];
    dispatch: React.Dispatch<AppAction>;
}

export const Notifications: React.FC<NotificationsProps> = ({ notifications, dispatch }) => {
    // Auto-dismiss notifications with autoClose set to true
    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = [];

        notifications.forEach(notification => {
            if (notification.autoClose !== false) {
                const timeout = setTimeout(() => {
                    dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
                }, 5000);

                timeouts.push(timeout);
            }
        });

        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
    }, [notifications, dispatch]);

    const handleDismiss = (id: string) => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    };

    if (notifications.length === 0) return null;

    return (
        <div className={styles.container}>
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`${styles.notification} ${styles[notification.type]}`}
                >
                    <div className={styles.message}>{notification.message}</div>
                    <button
                        className={styles.closeButton}
                        onClick={() => handleDismiss(notification.id)}
                        aria-label="Dismiss"
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
};
