import axios from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope, ApiErrorPayload } from '../types/api';
import type { LoginResponseData } from '../types/auth';
import {
    clearStoredSession,
    getAccessToken,
    getRefreshToken,
    updateStoredTokens
} from './authSession';

const API_BASE_URL = 'http://localhost:3000/api';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000,
    withCredentials: true
});

/** Raw client for refresh — avoids running the 401 retry interceptor on itself. */
const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
    withCredentials: true
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const AUTH_PATHS_NO_REFRESH = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/resend-otp'
];

function shouldAttemptTokenRefresh(url?: string): boolean {
    if (!url) return false;
    return !AUTH_PATHS_NO_REFRESH.some((path) => url.includes(path));
}

let refreshPromise: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const res = await refreshClient.post<ApiEnvelope<LoginResponseData>>('/auth/refresh', {
            refreshToken
        });
        const { accessToken, refreshToken: newRefresh, user } = res.data.data;
        updateStoredTokens(accessToken, newRefresh, user);
        return accessToken;
    } catch {
        return null;
    }
}

function handleSessionExpired() {
    clearStoredSession();
    onSessionExpired?.();

    const path = window.location.pathname;
    const isAuthPage =
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/reset-password');

    if (!isAuthPage) {
        window.location.assign('/login?session=expired');
    }
}

export function setupAuthInterceptor(onExpired: () => void) {
    onSessionExpired = onExpired;
}

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        const status = error.response?.status;

        if (
            status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            shouldAttemptTokenRefresh(originalRequest.url)
        ) {
            originalRequest._retry = true;

            if (!refreshPromise) {
                refreshPromise = refreshAccessToken().finally(() => {
                    refreshPromise = null;
                });
            }

            const newToken = await refreshPromise;
            if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);
            }

            handleSessionExpired();
        }

        return Promise.reject((error.response?.data as ApiErrorPayload) || error.message);
    }
);

/** Axios instance that returns unwrapped `response.data` (see response interceptor). */
export interface ApiClient {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

export default axiosInstance as unknown as ApiClient;
