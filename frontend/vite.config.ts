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
