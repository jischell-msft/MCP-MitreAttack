import React, { ReactNode } from 'react';
import styles from './Card.module.scss';

export interface CardProps {
    children: ReactNode;
    title?: string | ReactNode;
    subtitle?: string | ReactNode;
    headerActions?: ReactNode;
    footer?: ReactNode;
    className?: string;
    elevation?: 0 | 1 | 2 | 3;
    onClick?: () => void;
    hoverable?: boolean;
    bordered?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    title,
    subtitle,
    headerActions,
    footer,
    className,
    elevation = 1,
    onClick,
    hoverable = false,
    bordered = false,
    padding = 'md',
}) => {
    const classNames = [
        styles.card,
        styles[`elevation-${elevation}`],
        hoverable ? styles.hoverable : '',
        bordered ? styles.bordered : '',
        onClick ? styles.clickable : '',
        className || '',
    ].filter(Boolean).join(' ');

    const contentClasses = [
        styles.content,
        styles[`padding-${padding}`],
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} onClick={onClick}>
            {(title || subtitle || headerActions) && (
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        {title && (
                            <h3 className={styles.title}>
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <div className={styles.subtitle}>
                                {subtitle}
                            </div>
                        )}
                    </div>
                    {headerActions && (
                        <div className={styles.headerActions}>
                            {headerActions}
                        </div>
                    )}
                </div>
            )}

            <div className={contentClasses}>
                {children}
            </div>

            {footer && (
                <div className={styles.footer}>
                    {footer}
                </div>
            )}
        </div>
    );
};
