import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
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
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://api.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://api.mapbox.com https://*.cesium.com https://*.google.com http://localhost:*; connect-src 'self' https://mapiq.ir:* http://localhost:* https://*.tile.openstreetmap.org https://api.mapbox.com wss://*.cesium.com https://*.cesium.com https://*.google.com; worker-src 'self' blob:; child-src 'self' blob:;"
    },
    proxy: {
      '/api': {
        target: process.env.VITE_SERVER_PROXY || 'https://mapiq.ir:3002',
        changeOrigin: true,
        secure: true,
      },
      '/fb-api': {
        target: process.env.VITE_SERVER_PROXY || 'https://mapiq.ir:3002',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/fb-api/, '/api'),
      },
      '/geo': {
        target: process.env.VITE_GEOSERVER_PROXY || 'https://mapiq.ir:8080',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/geo/, ''),
      },
    }
  },
})
