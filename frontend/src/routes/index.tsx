import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from '../components/layout/MainLayout/MainLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner/LoadingSpinner';
import { ErrorBoundary } from '../components/common/ErrorBoundary/ErrorBoundary';

// Lazy-loaded route components
const Home = lazy(() => import('../features/home/Home'));
const Analysis = lazy(() => import('../features/analysis/Analysis'));
const ReportsList = lazy(() => import('../features/reports/ReportsList'));
const ReportDetail = lazy(() => import('../features/reports/ReportDetail'));
const SystemStatus = lazy(() => import('../features/system/SystemStatus'));
const NotFound = lazy(() => import('../components/common/NotFound/NotFound'));

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
