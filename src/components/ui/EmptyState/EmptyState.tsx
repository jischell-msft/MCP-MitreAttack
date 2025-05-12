import React, { ReactNode } from 'react';
import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
    icon?: ReactNode;
    title?: string;
    description?: string | ReactNode;
    action?: ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
}) => {
    const classNames = [
        styles.container,
        className || '',
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames}>
            {icon && <div className={styles.icon}>{icon}</div>}

            {title && <h3 className={styles.title}>{title}</h3>}

            {description && (
                <div className={styles.description}>
                    {description}
                </div>
            )}

            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
};
