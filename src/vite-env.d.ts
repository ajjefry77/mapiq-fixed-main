/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER?: string
  readonly VITE_GEOSERVER?: string
  readonly VITE_GEOSERVER_WORKSPACE?: string
  readonly VITE_MAPBOX_TOKEN?: string
  readonly VITE_WFS_MAX_FEATURES?: string

  readonly VITE_APP_ENV?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_LOG_ENABLED?: string
  readonly VITE_LOG_CONSOLE_ENABLED?: string
  readonly VITE_LOG_LEVEL?: string
  readonly VITE_LOG_ENDPOINT?: string
  readonly VITE_REMOTE_LOGGING_ENABLED?: string
  readonly VITE_LOG_BATCH_SIZE?: string
  readonly VITE_LOG_FLUSH_INTERVAL?: string
  readonly VITE_LOG_MAX_QUEUE_SIZE?: string
  readonly VITE_LOG_DEDUPE_WINDOW?: string
  readonly VITE_LOG_DEDUPE_MAX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
