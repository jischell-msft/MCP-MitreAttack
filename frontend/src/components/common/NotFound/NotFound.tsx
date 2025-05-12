import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.scss';

const NotFound: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>404</h1>
            <h2 className={styles.subtitle}>Page Not Found</h2>
            <p className={styles.message}>
                The page you are looking for does not exist or has been moved.
            </p>
            <Link to="/" className={styles.button}>
                Back to Home
            </Link>
        </div>
    );
};

export default NotFound;
