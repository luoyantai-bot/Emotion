/**
 * ============================================================
 * API Client - HTTP 通信层
 * ============================================================
 * 
 * 环境变量配置:
 *   VITE_API_BASE_URL  - 后端地址 (如 http://localhost:8000/api/v1)
 *   VITE_API_MODE      - "live" | "mock" (默认 mock)
 * 
 * 使用方式:
 *   .env.development:
 *     VITE_API_BASE_URL=http://localhost:8000/api/v1
 *     VITE_API_MODE=live
 * 
 *   .env.production:
 *     VITE_API_BASE_URL=https://your-api-domain.com/api/v1
 *     VITE_API_MODE=live
 */

import type { ApiError } from './types';

// ============================================================
// 配置
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _env = (import.meta as any).env || {};
const API_BASE_URL: string = _env.VITE_API_BASE_URL || '';
const API_MODE: string = _env.VITE_API_MODE || 'mock';

export function getApiConfig() {
  return {
    baseUrl: API_BASE_URL,
    mode: API_MODE as 'live' | 'mock',
    isLive: API_MODE === 'live' && API_BASE_URL !== '',
    isMock: API_MODE !== 'live' || API_BASE_URL === '',
  };
}

// ============================================================
// HTTP Client
// ============================================================

export class ApiClientError extends Error {
  status: number;
  body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.detail || `API Error ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * 底层 HTTP 请求封装
 * - 自动添加 Content-Type
 * - 自动序列化/反序列化 JSON
 * - 统一错误处理
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const config = getApiConfig();

  if (config.isMock) {
    throw new Error(`[API Client] Mock mode - should not reach HTTP layer. Path: ${path}`);
  }

  const { method = 'GET', body, headers = {}, params } = options;

  // 构建 URL
  let url = `${config.baseUrl}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log(`[API] ${method} ${url}`, body || '');

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let errorBody: ApiError;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { detail: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new ApiClientError(response.status, errorBody);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================
// 导出便捷方法
// ============================================================

export const http = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
