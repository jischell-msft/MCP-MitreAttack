import React from 'react';
import styles from './LoadingSpinner.module.scss';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    inline?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    inline = false
}) => {
    const containerClass = inline
        ? styles.inlineContainer
        : styles.fullContainer;

    return (
        <div className={containerClass}>
            <div className={`${styles.spinner} ${styles[size]}`}>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>
    );
};
