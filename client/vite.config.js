import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5173,
        // В разработке запросы /api/* уходят на Express (npm run dev:server)
        proxy: {
            '/api': 'http://localhost:3000'
        }
    },
    build: {
        outDir: 'dist'
    }
});
