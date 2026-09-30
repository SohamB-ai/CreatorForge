import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': process.env.E2E_START_SERVER === 'true' ? 'http://127.0.0.1:5101' : 'http://127.0.0.1:5001' } } });
