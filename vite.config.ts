import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { fileURLToPath, URL } from 'node:url'
import path from 'path';
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [vue(), cesium({ devMinifyCesium: true })],
  resolve: {
    alias: {
      cesium: path.resolve(__dirname, 'node_modules/cesium/Source'),
    },
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_SERVER_PROXY || 'https://mapiq.ir:3002',
        changeOrigin: true,
      },
      '/fb-api': {
        target: process.env.VITE_SERVER_PROXY || 'https://mapiq.ir:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fb-api/, '/api'),
      },
      '/geo': {
        target: process.env.VITE_GEOSERVER_PROXY || 'https://mapiq.ir:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geo/, ''),
      },
    }
  },
})
