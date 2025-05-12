import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    ...rest
}) => {
    const classNames = [
        styles.button,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        fullWidth ? styles.fullWidth : '',
        loading ? styles.loading : '',
        className || '',
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classNames}
            disabled={disabled || loading}
            {...rest}
        >
            {loading && <span className={styles.spinner} />}
            {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
            <span className={styles.content}>{children}</span>
            {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </button>
    );
};
