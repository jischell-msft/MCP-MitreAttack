import { useEffect } from 'react';
import { AppRouter } from './routes';
import { Notifications } from './components/ui/Notifications/Notifications';
import { useAppContext } from './context/AppContext';

export const App = () => {
    const { state, dispatch } = useAppContext();

    // Initialize theme from system preference or local storage
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

        if (savedTheme) {
            dispatch({ type: 'SET_THEME', payload: savedTheme });
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            dispatch({ type: 'SET_THEME', payload: prefersDark ? 'dark' : 'light' });
        }
    }, [dispatch]);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('theme', state.theme);
    }, [state.theme]);

    return (
        <div className={`app ${state.theme}`}>
            <Notifications notifications={state.notifications} dispatch={dispatch} />
            <AppRouter />
        </div>
    );
};
