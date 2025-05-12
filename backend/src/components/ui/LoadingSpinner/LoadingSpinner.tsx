import React from 'react';
import styles from './LoadingSpinner.module.scss';

export interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    color?: 'primary' | 'secondary' | 'white';
    label?: string;
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    color = 'primary',
    label,
    className,
}) => {
    const spinnerClasses = [
        styles.spinner,
        styles[`size-${size}`],
        styles[`color-${color}`],
        className || '',
    ].filter(Boolean).join(' ');

    return (
        <div className={styles.container}>
            <div className={spinnerClasses} role="status">
                <span className={styles.visuallyHidden}>Loading...</span>
            </div>
            {label && <p className={styles.label}>{label}</p>}
        </div>
    );
};
