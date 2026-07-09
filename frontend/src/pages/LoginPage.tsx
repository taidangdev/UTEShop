import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { mergeLocalCartToServer } from '../services/cartApi';
import { loginUser, clearAuthError } from '../store/authSlice';
import AuthShell from '../components/auth/AuthShell';

const REMEMBER_KEY = 'uteshop_remember_email';
const AUTH_ROUTES = new Set(['/login', '/register', '/activate', '/forgot-password']);

function resolvePostLoginPath(role: string | undefined, fromPath: string) {
    if (role === 'admin') {
        return '/admin/dashboard';
    }
    if (!fromPath || AUTH_ROUTES.has(fromPath)) {
        return '/';
    }
    return fromPath;
}

const LoginPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const justActivated = location.state?.justActivated === true;

    const { loginLoading, error, fieldErrors, user } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));

    useEffect(() => {
        if (user) {
            navigate(resolvePostLoginPath(user.role, from), { replace: true });
        }
    }, [user, navigate, from]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        const result = await dispatch(loginUser({ email: trimmedEmail, password }));
        if (loginUser.fulfilled.match(result)) {
            mergeLocalCartToServer().catch(() => {});
            if (rememberMe) {
                localStorage.setItem(REMEMBER_KEY, trimmedEmail);
            } else {
                localStorage.removeItem(REMEMBER_KEY);
            }
            navigate(resolvePostLoginPath(result.payload.user?.role, from), { replace: true });
            return;
        }
        if (loginUser.rejected.match(result)) {
            const p = result.payload;
            const isInactive =
                typeof p === 'object' &&
                p !== null &&
                (p.code === 'ACCOUNT_INACTIVE' ||
                    (typeof p.message === 'string' && p.message.includes('chưa kích hoạt')));
            if (isInactive) {
                dispatch(clearAuthError());
                navigate('/activate', {
                    replace: true,
                    state: { email: trimmedEmail, fromLoginAt: Date.now() }
                });
            }
        }
    };

    const clearErrorOnChange = () => {
        if (error) dispatch(clearAuthError());
    };

    const emailError = fieldErrors.email;
    const passwordError = fieldErrors.password;

    return (
        <AuthShell activeTab="login">
            <div className="p-8 md:p-10">
                <div className="space-y-6">
                    <div className="mb-4 text-center">
                        <h2 className="text-2xl font-semibold text-on-surface">Chào mừng quay trở lại</h2>
                        <p className="mt-1 text-base text-on-surface-variant">
                            Đăng nhập cổng thiết bị học tập của bạn
                        </p>
                    </div>

                    {justActivated && (
                        <div
                            className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface"
                            role="status"
                        >
                            Tài khoản đã kích hoạt thành công. Bạn có thể đăng nhập ngay.
                        </div>
                    )}

                    {error && (
                        <div
                            className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="login-email"
                                className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant"
                            >
                                Email sinh viên
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                                    alternate_email
                                </span>
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        clearErrorOnChange();
                                    }}
                                    placeholder="sv@student.hcmute.edu.vn"
                                    className={`h-14 w-full rounded-xl border-none bg-surface-container pl-12 pr-4 text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 ${
                                        emailError ? 'ring-2 ring-error/30' : ''
                                    }`}
                                />
                            </div>
                            {emailError && (
                                <p className="mt-1 ml-1 text-xs text-error">{emailError}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="login-password"
                                className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant"
                            >
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                                    lock
                                </span>
                                <input
                                    id="login-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        clearErrorOnChange();
                                    }}
                                    placeholder="••••••••"
                                    className={`h-14 w-full rounded-xl border-none bg-surface-container pl-12 pr-12 text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 ${
                                        passwordError ? 'ring-2 ring-error/30' : ''
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-primary"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    <span className="material-symbols-outlined">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                            {passwordError && (
                                <p className="mt-1 ml-1 text-xs text-error">{passwordError}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="group flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-5 w-5 rounded border-outline-variant text-primary transition-all focus:ring-primary/20"
                                />
                                <span className="text-sm font-medium text-on-surface-variant transition-colors group-hover:text-on-surface">
                                    Ghi nhớ đăng nhập
                                </span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Quên mật khẩu?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <span>{loginLoading ? 'Đang đăng nhập…' : 'Tiếp tục'}</span>
                            {!loginLoading && (
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            )}
                        </button>
                    </form>

                </div>
            </div>
        </AuthShell>
    );
};

export default LoginPage;

