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
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('cesium')) return 'cesium'
          if (id.includes('mapbox-gl')) return 'mapbox'
          if (id.includes('leaflet')) return 'leaflet'
          if (id.includes('shpjs') || id.includes('proj4') || id.includes('papaparse')) return 'geo'
          if (id.includes('vue') || id.includes('pinia') || id.includes('@vue')) return 'vue'
          return 'vendor'
        },
      },
    },
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
