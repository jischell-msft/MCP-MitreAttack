import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../Header/Header';
import { Footer } from '../Footer/Footer';
import { SideNav } from '../SideNav/SideNav';
import styles from './MainLayout.module.scss';

export const MainLayout: React.FC = () => {
    return (
        <div className={styles.layout}>
            <Header />
            <div className={styles.container}>
                <SideNav />
                <main className={styles.main}>
                    <Outlet />
                </main>
            </div>
            <Footer />
        </div>
    );
};
