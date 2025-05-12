# React Project Setup

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. Now we need to create the frontend application that will allow users to submit documents, view results, and interact with the system. This step focuses on setting up the React project with TypeScript and configuring the necessary build tools.

## Requirements
- Create a modern React application with TypeScript
- Set up project structure following best practices
- Configure build tools and development environment
- Create the API client for communicating with the backend
- Set up routing and basic state management

## Tasks

### 4.1.1. Initialize React project with TypeScript
- Use Vite to create a new React project
- Configure TypeScript for strict type checking
- Set up project structure and folder organization
- Configure environment variables

### 4.1.2. Set up folder structure and conventions
- Implement feature-based organization
- Create shared component structure
- Set up utility and hook directories
- Define type organization
- Establish naming conventions

### 4.1.3. Configure build process
- Set up Vite configuration
- Configure CSS/SCSS processing
- Add asset handling
- Set up environment-specific builds
- Configure code splitting

### 4.1.4. Create API client for backend communication
- Create typed API client using Axios
- Implement request/response interceptors
- Add error handling
- Create response models matching backend
- Implement authentication (if needed)

### 4.1.5. Set up routing with React Router
- Install and configure React Router
- Create route definitions
- Implement layout components
- Add route guards and protection
- Set up lazy loading for routes

### 4.1.6. Implement basic state management
- Set up React Context for global state
- Create state management hooks
- Implement persistent state handling
- Add type definitions for state
- Set up API request caching

### 4.1.7. Create theme and styling foundation
- Set up design tokens (colors, spacing, etc.)
- Implement responsive breakpoints
- Create typography system
- Set up global styles
- Configure dark/light mode support

### 4.1.8. Implement error handling utilities
- Create error boundary components
- Implement error notification system
- Add global error handling
- Create error logging utilities
- Implement retry mechanisms

## Implementation Guidance

The implementation should:
- Follow React and TypeScript best practices
- Use modern React features (hooks, context, etc.)
- Implement a clean and maintainable project structure
- Create a flexible and scalable styling approach
- Provide a solid foundation for the UI components

Start by initializing the React project, then set up the project structure and build process. Next, create the API client and routing. Finally, implement state management, styling, and error handling.

## Project Structure

Implement a feature-based organization with shared components:

```
frontend/
  ├── src/
  │   ├── assets/            # Static assets (images, fonts, etc.)
  │   ├── components/        # Shared components
  │   │   ├── ui/            # Basic UI components
  │   │   ├── layout/        # Layout components
  │   │   └── common/        # Common feature components
  │   ├── features/          # Feature-specific code
  │   │   ├── analysis/      # Document analysis feature
  │   │   ├── reports/       # Report viewing feature
  │   │   └── system/        # System management feature
  │   ├── hooks/             # Custom hooks
  │   ├── services/          # Services (API, storage, etc.)
  │   │   ├── api/           # API client
  │   │   └── storage/       # Storage utilities
  │   ├── types/             # TypeScript type definitions
  │   ├── utils/             # Utility functions
  │   ├── context/           # React context providers
  │   ├── routes/            # Route definitions
  │   ├── styles/            # Global styles and theme
  │   ├── App.tsx            # Main App component
  │   ├── main.tsx           # Entry point
  │   └── vite-env.d.ts      # Vite environment types
  ├── public/                 # Public assets
  ├── index.html             # HTML template
  ├── package.json           # Dependencies and scripts
  ├── tsconfig.json          # TypeScript configuration
  ├── vite.config.ts         # Vite configuration
  └── .env                   # Environment variables
```

## API Client Setup

Create a typed API client with Axios:

```typescript
// services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleApiError } from './error-handler';

// API client configuration
const apiConfig: AxiosRequestConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create API client instance
const apiClient: AxiosInstance = axios.create(apiConfig);

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Process successful responses
    return response.data;
  },
  (error) => {
    // Handle errors
    return Promise.reject(handleApiError(error));
  }
);

export default apiClient;
```

## API Service Implementation

Create typed API services for each endpoint:

```typescript
// services/api/analysis-service.ts
import apiClient from './client';
import { AnalysisJob, AnalysisJobStatus, AnalysisRequest } from '../../types/analysis';

export const AnalysisService = {
  // Submit URL for analysis
  submitUrl: async (url: string, options?: any): Promise<AnalysisJob> => {
    const response = await apiClient.post('/analyze', { url, options });
    return response.data;
  },
  
  // Submit document for analysis
  submitDocument: async (file: File, options?: any): Promise<AnalysisJob> => {
    const formData = new FormData();
    formData.append('document', file);
    
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    const response = await apiClient.post('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  // Check job status
  getJobStatus: async (jobId: string): Promise<AnalysisJobStatus> => {
    const response = await apiClient.get(`/analyze/${jobId}`);
    return response.data;
  },
};

// services/api/reports-service.ts
import apiClient from './client';
import { PaginatedResponse, ReportSummary, ReportDetail, ReportFilters } from '../../types/reports';

export const ReportsService = {
  // Get list of reports
  getReports: async (filters: ReportFilters): Promise<PaginatedResponse<ReportSummary>> => {
    const response = await apiClient.get('/reports', {
      params: filters,
    });
    return response.data;
  },
  
  // Get report details
  getReportById: async (id: string): Promise<ReportDetail> => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },
  
  // Delete report
  deleteReport: async (id: string): Promise<void> => {
    await apiClient.delete(`/reports/${id}`);
  },
  
  // Export report
  exportReport: async (id: string, format: 'json' | 'csv' | 'html' | 'pdf'): Promise<Blob> => {
    const response = await apiClient.post('/reports/export', { id, format }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Additional service files for other endpoints...
```

## Routing Setup

Configure React Router:

```typescript
// routes/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// Lazy-loaded route components
const Home = lazy(() => import('../features/home/Home'));
const Analysis = lazy(() => import('../features/analysis/Analysis'));
const ReportsList = lazy(() => import('../features/reports/ReportsList'));
const ReportDetail = lazy(() => import('../features/reports/ReportDetail'));
const SystemStatus = lazy(() => import('../features/system/SystemStatus'));
const NotFound = lazy(() => import('../components/common/NotFound'));

// Route definitions
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'analyze',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Analysis />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ReportsList />
          </Suspense>
        ),
      },
      {
        path: 'reports/:id',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ReportDetail />
          </Suspense>
        ),
      },
      {
        path: 'system',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <SystemStatus />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <NotFound />
          </Suspense>
        ),
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
```

## State Management

Set up React Context for global state:

```typescript
// context/AppContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

// Define state interface
interface AppState {
  theme: 'light' | 'dark';
  notifications: Notification[];
  user: User | null;
  isLoading: boolean;
}

// Define notification interface
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  autoClose?: boolean;
}

// Define user interface
interface User {
  id: string;
  username: string;
  role: string;
}

// Define actions
type AppAction =
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
```

## Styling Foundation

Set up styling with CSS variables:

```typescript
// styles/theme.ts
export const lightTheme = {
  colors: {
    primary: '#1a73e8',
    secondary: '#5f6368',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#202124',
    textSecondary: '#5f6368',
    border: '#dadce0',
    error: '#ea4335',
    warning: '#fbbc04',
    success: '#34a853',
    info: '#4285f4',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    circle: '50%',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      xs: 1.25,
      sm: 1.43,
      md: 1.5,
      lg: 1.56,
      xl: 1.6,
    },
  },
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  zIndex: {
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
};

export const darkTheme = {
  colors: {
    primary: '#8ab4f8',
    secondary: '#9aa0a6',
    background: '#202124',
    surface: '#303134',
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    border: '#5f6368',
    error: '#f28b82',
    warning: '#fdd663',
    success: '#81c995',
    info: '#8ab4f8',
  },
  // Other properties remain the same as lightTheme
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
  breakpoints: lightTheme.breakpoints,
  shadows: lightTheme.shadows,
  zIndex: lightTheme.zIndex,
};

export type Theme = typeof lightTheme;
```

## Error Handling

Implement error handling utilities:

```typescript
// utils/error-handler.ts
import { AxiosError } from 'axios';

// Custom error class
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Handle API errors
export function handleApiError(error: unknown): AppError {
  if (error instanceof AxiosError) {
    const status = error.response?.status || 500;
    const responseData = error.response?.data;
    
    // Handle API error responses
    if (responseData?.error) {
      return new AppError(
        responseData.error.code || 'API_ERROR',
        responseData.error.message || error.message,
        status,
        responseData.error.details
      );
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return new AppError(
        'REQUEST_TIMEOUT',
        'Request timed out. Please try again.',
        408
      );
    }
    
    if (!error.response) {
      return new AppError(
        'NETWORK_ERROR',
        'Network error. Please check your connection.',
        0
      );
    }
    
    // Map status codes to error messages
    switch (status) {
      case 400:
        return new AppError(
          'BAD_REQUEST',
          'Invalid request data',
          status,
          responseData?.error?.details
        );
      case 401:
        return new AppError(
          'UNAUTHORIZED',
          'Authentication required',
          status
        );
      case 403:
        return new AppError(
          'FORBIDDEN',
          'You do not have permission to access this resource',
          status
        );
      case 404:
        return new AppError(
          'NOT_FOUND',
          'The requested resource was not found',
          status
        );
      case 429:
        return new AppError(
          'RATE_LIMITED',
          'Too many requests. Please try again later',
          status
        );
      case 500:
        return new AppError(
          'SERVER_ERROR',
          'An unexpected server error occurred',
          status
        );
      default:
        return new AppError(
          'UNKNOWN_ERROR',
          `Error: ${error.message}`,
          status
        );
    }
  }
  
  // Handle non-axios errors
  return new AppError(
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : 'An unknown error occurred',
    500
  );
}

// Error boundary component
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An error occurred'}</p>
          <button onClick={() => window.location.reload()}>
            Refresh the page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Vite Configuration

Configure Vite for production builds:

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      minify: mode === 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            utils: [
              '@tanstack/react-query',
              'axios',
              'zod',
              'date-fns',
            ],
          },
        },
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },
  };
});
```

## Main Application Entry

Set up the main application entry point:

```typescript
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './styles/global.scss';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <App />
      </AppProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);
```

## App Component

Create the main App component:

```typescript
// App.tsx
import { useEffect } from 'react';
import { AppRouter } from './routes';
import { Notifications } from './components/ui/Notifications';
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
```
