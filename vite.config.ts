import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { youtubeApiMiddleware, youtubeVideoMiddleware, youtubeWaveformMiddleware } from './server/youtube-api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'youtube-api',
      configureServer(server) {
        server.middlewares.use(youtubeApiMiddleware());
        server.middlewares.use(youtubeVideoMiddleware());
        server.middlewares.use(youtubeWaveformMiddleware());
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
