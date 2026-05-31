import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { mergeLocalCartToServer } from '../services/cartApi';
import { loginUser, clearAuthError } from '../store/authSlice';
import AuthShell from '../components/auth/AuthShell';

const REMEMBER_KEY = 'uteshop_remember_email';

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
            navigate(from, { replace: true });
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
            navigate(from, { replace: true });
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
                        <h2 className="text-2xl font-semibold text-on-surface">Welcome back</h2>
                        <p className="mt-1 text-base text-on-surface-variant">
                            Access your academic hardware portal
                        </p>
                    </div>

                    {justActivated && (
                        <div
                            className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface"
                            role="status"
                        >
                            Account activated. You can sign in now.
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
                                Student Email
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
                                    placeholder="student@university.edu"
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
                                Password
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
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                                    Remember me
                                </span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <span>{loginLoading ? 'Signing in…' : 'Continue'}</span>
                            {!loginLoading && (
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            )}
                        </button>
                    </form>

                    <div className="relative flex items-center py-4">
                        <div className="flex-grow border-t border-outline-variant/30" />
                        <span className="mx-4 shrink-0 text-xs font-semibold uppercase tracking-widest text-outline">
                            Or Secure SSO
                        </span>
                        <div className="flex-grow border-t border-outline-variant/30" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            disabled
                            title="Coming soon"
                            className="group flex h-12 items-center justify-center rounded-xl border border-outline-variant/40 transition-all hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span className="material-symbols-outlined mr-2 text-on-surface-variant group-hover:text-primary">
                                school
                            </span>
                            <span className="text-xs text-on-surface">EDU Login</span>
                        </button>
                        <button
                            type="button"
                            disabled
                            title="Coming soon"
                            className="group flex h-12 items-center justify-center rounded-xl border border-outline-variant/40 transition-all hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span className="material-symbols-outlined mr-2 text-on-surface-variant group-hover:text-primary">
                                token
                            </span>
                            <span className="text-xs text-on-surface">SAML 2.0</span>
                        </button>
                    </div>
                </div>
            </div>
        </AuthShell>
    );
};

export default LoginPage;

