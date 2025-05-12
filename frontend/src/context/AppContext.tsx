import { createContext, useContext, useReducer, ReactNode } from 'react';

// Define state interface
export interface AppState {
    theme: 'light' | 'dark';
    notifications: Notification[];
    user: User | null;
    isLoading: boolean;
}

// Define notification interface
export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    autoClose?: boolean;
}

// Define user interface
export interface User {
    id: string;
    username: string;
    role: string;
}

// Define actions
export type AppAction =
    | { type: 'SET_THEME'; payload: 'light' | 'dark' }
    | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id'> }
    | { type: 'REMOVE_NOTIFICATION'; payload: string }
    | { type: 'SET_USER'; payload: User | null }
    | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AppState = {
    theme: 'light',
    notifications: [],
    user: null,
    isLoading: false,
};

// Create context
const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}>({
    state: initialState,
    dispatch: () => null,
});

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'SET_THEME':
            return { ...state, theme: action.payload };
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [
                    ...state.notifications,
                    { ...action.payload, id: crypto.randomUUID() },
                ],
            };
        case 'REMOVE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(
                    (n) => n.id !== action.payload
                ),
            };
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        default:
            return state;
    }
};

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

// Hook for using the context
export const useAppContext = () => useContext(AppContext);
