import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.scss';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    id,
    ...rest
}, ref) => {
    const uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

    const containerClasses = [
        styles.container,
        fullWidth ? styles.fullWidth : '',
        error ? styles.error : '',
        className || '',
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            {label && (
                <label htmlFor={uniqueId} className={styles.label}>
                    {label}
                </label>
            )}
            <div className={styles.inputWrapper}>
                {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
                <input
                    id={uniqueId}
                    ref={ref}
                    className={styles.input}
                    aria-invalid={!!error}
                    aria-describedby={
                        error
                            ? `${uniqueId}-error`
                            : helperText
                                ? `${uniqueId}-helper`
                                : undefined
                    }
                    {...rest}
                />
                {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
            </div>
            {error && (
                <p id={`${uniqueId}-error`} className={styles.errorText}>
                    {error}
                </p>
            )}
            {!error && helperText && (
                <p id={`${uniqueId}-helper`} className={styles.helperText}>
                    {helperText}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
