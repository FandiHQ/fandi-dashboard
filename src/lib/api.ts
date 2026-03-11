import axios, { AxiosError } from 'axios';
import { supabase } from './supabase';

// ── Typed API error for TanStack Query error handling ──
export class ApiError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 15_000,
});

// ── REQUEST interceptor: attach Supabase JWT ──
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

// ── RESPONSE interceptor: unwrap API envelope + handle errors ──
api.interceptors.response.use(
    (response) => {
        // API returns { success: true, data: T }
        // Unwrap so callers get T directly via response.data
        if (response.data?.success !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    (error: AxiosError<{ success: false; error: { code: string; message: string } }>) => {
        if (error.response?.status === 401) {
            // Session expired — hard redirect
            // Cannot use Next.js router from non-component file
            if (typeof window !== 'undefined') {
                window.location.href = '/login?expired=true';
            }
            return Promise.reject(new ApiError('UNAUTHORIZED', 'Session expired', 401));
        }

        // Extract API error from response body
        const apiError = error.response?.data?.error;
        if (apiError) {
            return Promise.reject(
                new ApiError(apiError.code, apiError.message, error.response!.status)
            );
        }

        // Network error / timeout
        return Promise.reject(
            new ApiError('NETWORK_ERROR', error.message || 'Network error', 0)
        );
    }
);

export default api;

// RESULT of both interceptors working together:
// 1. api.get('/events') → backend responds { success: true, data: [...] }
// 2. Response interceptor unwraps → response.data = [...]
// 3. Caller does response.data → gets Event[]
// 4. On error → throws ApiError with code, message, status
