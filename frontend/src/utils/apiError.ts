import type { ApiErrorPayload } from '../types/api';

export function extractApiError(err: unknown, fallback = 'Đã xảy ra lỗi'): string {
    if (typeof err === 'string') return err;
    const payload = err as ApiErrorPayload;
    if (payload.errors?.length) {
        return payload.errors.map((e) => e.msg).join('. ');
    }
    if (payload.message) return payload.message;
    if (err instanceof Error) return err.message;
    return fallback;
}
