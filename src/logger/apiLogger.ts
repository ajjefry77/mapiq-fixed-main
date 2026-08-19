import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { EV } from './events';
import { beginRequest, endRequest } from './context';
import { getActiveLogger } from './logger';
import { sanitizeUrl } from './sanitizer';
import { withPerf } from './perf';

/**
 * Attach structured request lifecycle logging to any axios instance.
 *
 * Emits:
 *   api.request.started  (DEBUG)  — method, url, requestId
 *   api.request.success  (INFO)   — method, url, status, durationMs, requestId
 *   api.request.failed   (ERROR)  — method, url, status, durationMs, error info
 *   api.request.timeout  (ERROR)  — same as failed but typed as a timeout
 *
 * Only safe metadata is logged: no headers, no bodies, no tokens. URLs are run
 * through sanitizeUrl so query tokens are masked.
 */

interface RequestMeta {
  startedAt: number;
  requestId?: string;
  traceId?: string;
}

const getMeta = (config: InternalAxiosRequestConfig | undefined): RequestMeta | undefined =>
  (config as unknown as { __loggerMeta?: RequestMeta } | undefined)?.__loggerMeta;

function logRequestStarted(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const scope = beginRequest();
  (config as unknown as { __loggerMeta: RequestMeta }).__loggerMeta = {
    startedAt: Date.now(),
    requestId: scope.requestId,
    traceId: scope.traceId,
  };
  getActiveLogger()?.debug(EV.API_REQUEST_STARTED, {
    method: config.method?.toUpperCase(),
    url: sanitizeUrl(config.url ?? ''),
    requestId: scope.requestId,
  });
  return config;
}

function logRequestError(requestError: unknown): Promise<never> {
  const err = requestError as {
    config?: InternalAxiosRequestConfig;
    response?: { status?: number };
    code?: string;
    message?: string;
  };
  const meta = getMeta(err.config);
  const durationMs = meta ? Date.now() - meta.startedAt : 0;
  const status = err.response?.status;
  const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
  getActiveLogger()?.error(isTimeout ? EV.API_REQUEST_TIMEOUT : EV.API_REQUEST_FAILED, withPerf({
    method: err.config?.method?.toUpperCase(),
    url: sanitizeUrl(err.config?.url ?? ''),
    status,
    requestId: meta?.requestId,
    errorCode: err.code,
  }, durationMs), requestError);
  endRequest();
  return Promise.reject(requestError);
}

function logRequestSuccess(response: AxiosResponse): AxiosResponse {
  const meta = getMeta(response.config);
  const durationMs = meta ? Date.now() - meta.startedAt : 0;
  getActiveLogger()?.info(EV.API_REQUEST_SUCCESS, withPerf({
    method: response.config.method?.toUpperCase(),
    url: sanitizeUrl(response.config.url ?? ''),
    status: response.status,
    requestId: meta?.requestId,
  }, durationMs));
  endRequest();
  return response;
}

export function setupApiLogging(instance: AxiosInstance): void {
  instance.interceptors.request.use(logRequestStarted, logRequestError);
  instance.interceptors.response.use(logRequestSuccess, logRequestError);
}