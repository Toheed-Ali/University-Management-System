import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        target: 'es2020',
        cssCodeSplit: true,
        sourcemap: false,
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('xlsx') || id.includes('pdfjs-dist') || id.includes('react-pdf') || id.includes('docx-preview') || id.includes('mammoth') || id.includes('jszip')) return 'file-preview-vendor';
                    }
                }
            }
        }
    },
    server: {
        host: true,
        allowedHosts: [
            'unsuitable-paediatric-marjory.ngrok-free.dev',
            '.ngrok-free.app',
            '.ngrok-free.dev'
        ],
        proxy: {
            '/api/v1': {
                target: 'http://127.0.0.1:3002',
                changeOrigin: true,
                secure: false
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})