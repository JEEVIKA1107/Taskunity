import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
   proxy: {
  '/api': {
    target: 'http://10.132.111.133:5000',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://10.132.111.133:5000',
    changeOrigin: true,
  }
}
  }
})
