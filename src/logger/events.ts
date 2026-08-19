/**
 * Event-name registry.
 *
 * Naming convention:
 *   domain.subdomain.action.status
 *
 * Examples:
 *   auth.login.success        auth.login.failed
 *   api.request.started       api.request.success  api.request.failed
 *   map.initialized           map.layer.loaded     map.layer.failed
 *   ui.modal.opened
 *   app.initialized           app.error            app.fatal
 *
 * Rules:
 *   - lowercase, dot-separated, domains first
 *   - every async flow MUST have started|success|failed|timeout suffixes
 *   - never embed user input or runtime values into the event name
 *   - keep a fixed vocabulary (this file) so events stay searchable + groupable
 */

export const EV = {
  APP_BOOT: 'app.initialized',
  APP_ERROR: 'app.error',
  APP_RUNTIME_ERROR: 'app.runtime.error',
  APP_PROMISE_REJECTED: 'app.promise.rejected',
  APP_VUE_ERROR: 'app.vue.error',
  APP_CHUNK_LOAD_FAILED: 'app.chunk.load.failed',
  APP_FATAL: 'app.fatal',
  APP_NETWORK_ONLINE: 'app.network.online',
  APP_NETWORK_OFFLINE: 'app.network.offline',

  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER_SUCCESS: 'auth.register.success',
  AUTH_REGISTER_FAILED: 'auth.register.failed',
  AUTH_SESSION_EXPIRED: 'auth.session.expired',
  AUTH_SYNC_FB_FAILED: 'auth.sync.fb.failed',

  API_REQUEST_STARTED: 'api.request.started',
  API_REQUEST_SUCCESS: 'api.request.success',
  API_REQUEST_FAILED: 'api.request.failed',
  API_REQUEST_TIMEOUT: 'api.request.timeout',
  API_REQUEST_RATE_LIMITED: 'api.request.rate.limited',

  ROUTE_ENTER: 'route.enter',
  ROUTE_LEAVE: 'route.leave',
  ROUTE_NAVIGATION_FAILED: 'route.navigation.failed',

  APP_CONFIG_LOAD_FAILED: 'app.config.load.failed',

  MAP_INITIALIZED: 'map.initialized',
  MAP_INIT_FAILED: 'map.init.failed',
  MAP_LAYER_LOADED: 'map.layer.loaded',
  MAP_LAYER_FAILED: 'map.layer.failed',
  MAP_LAYER_REMOVED: 'map.layer.removed',
  MAP_TILESET_FAILED: 'map.tileset.failed',

  FILE_UPLOAD_STARTED: 'file.upload.started',
  FILE_UPLOAD_SUCCESS: 'file.upload.success',
  FILE_UPLOAD_FAILED: 'file.upload.failed',
  FILE_LOAD_FAILED: 'file.load.failed',
  FILE_SAVE_FAILED: 'file.save.failed',

  USER_ACTION_STARTED: 'user.action.started',
  USER_ACTION_COMPLETED: 'user.action.completed',
  USER_ACTION_FAILED: 'user.action.failed',

  UI_MODAL_OPENED: 'ui.modal.opened',
  UI_MODAL_CLOSED: 'ui.modal.closed',

  SEARCH_STARTED: 'search.started',
  SEARCH_COMPLETED: 'search.completed',
  SEARCH_FAILED: 'search.failed',
  SEARCH_LOCATION_FAILED: 'search.location.failed',

  WORKSPACE_SAVE_FAILED: 'workspace.save.failed',
  WORKSPACE_LOAD_FAILED: 'workspace.load.failed',
  SETTINGS_LOAD_FAILED: 'settings.load.failed',
  SETTINGS_SAVE_FAILED: 'settings.save.failed',
} as const;

export type EventName = (typeof EV)[keyof typeof EV];