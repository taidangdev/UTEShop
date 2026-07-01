import { useEffect, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    registerUser,
    verifyRegistrationEmail,
    resendRegistrationOtp,
    clearAuthError,
    clearRegisterSuccess
} from '../store/authSlice';
import axiosInstance from '../services/axiosConfig';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import OtpBoxes from '../components/auth/OtpBoxes';
import type { ApiEnvelope } from '../types/api';
import type { Major } from '../types/catalog';

function digitsOnly(value: string | null | undefined) {
    return String(value ?? '').replace(/\D/g, '').slice(0, 6);
}

const loginSecondary = {
    to: '/login',
    title: 'Already have an account?',
    subtitle: 'Sign in to access your academic hardware portal.'
};

const RegisterPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const {
        registerLoading,
        verifyEmailLoading,
        resendOtpLoading,
        error,
        fieldErrors,
        registerSuccess,
        registerInfo,
        verifyEmailSuccess,
        user
    } = useAppSelector((state) => state.auth);

    const [majors, setMajors] = useState<Major[]>([]);
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [studentId, setStudentId] = useState('');
    const [majorId, setMajorId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [resendHint, setResendHint] = useState<string | null>(null);

    const activationEmail = registerInfo?.email ?? email.trim();

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        axiosInstance
            .get<ApiEnvelope<{ majors: Major[] }>>('/catalog/majors')
            .then((res) => {
                setMajors(res.data?.majors ?? []);
            })
            .catch(() => setMajors([]));
    }, []);

    useEffect(() => {
        return () => {
            dispatch(clearRegisterSuccess());
        };
    }, [dispatch]);

    const clearErrors = () => {
        if (error) dispatch(clearAuthError());
        setLocalError(null);
    };

    const handleSubmitRegister = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setResendHint(null);
        const trimmedEmail = email.trim();
        if (!trimmedEmail.toLowerCase().endsWith('@student.hcmute.edu.vn')) {
            setLocalError('Email phải là email sinh viên HCMUTE (đuôi @student.hcmute.edu.vn).');
            return;
        }
        if (password !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }
        await dispatch(
            registerUser({
                username: username.trim(),
                email: trimmedEmail,
                password,
                fullName: fullName.trim(),
                studentId: studentId.trim(),
                majorId: majorId ? Number(majorId) : null
            })
        );
    };

    const handleSubmitOtp = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setResendHint(null);
        const code = digitsOnly(otp);
        if (code.length !== 6) {
            setLocalError('Please enter all 6 digits.');
            return;
        }
        await dispatch(
            verifyRegistrationEmail({
                email: activationEmail,
                otp: code
            })
        );
    };

    const handleResendOtp = async () => {
        setLocalError(null);
        setResendHint(null);
        if (!activationEmail) return;
        try {
            await dispatch(resendRegistrationOtp({ email: activationEmail })).unwrap();
            setResendHint('A new code was sent. Check your email (or server console in dev).');
        } catch {
            /* Redux error */
        }
    };

    const showOtpStep = registerSuccess && registerInfo && !verifyEmailSuccess;

    const passwordToggle = (
        visible: boolean,
        setVisible: Dispatch<SetStateAction<boolean>>
    ) => (
        <button
            type="button"
            onClick={() => setVisible((v: boolean) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-primary"
            aria-label={visible ? 'Hide password' : 'Show password'}
        >
            <span className="material-symbols-outlined">{visible ? 'visibility_off' : 'visibility'}</span>
        </button>
    );

    let content;

    if (verifyEmailSuccess) {
        content = (
            <div className="space-y-6 p-8 md:p-10">
                <div className="text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[48px]">verified</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-on-surface">Account verified</h2>
                    <p className="mt-2 text-base text-on-surface-variant">
                        Your email is confirmed. You can sign in now.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        navigate('/login', { replace: true, state: { justActivated: true } })
                    }
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95"
                >
                    <span>Continue to Login</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
            </div>
        );
    } else if (showOtpStep) {
        content = (
            <div className="space-y-6 p-8 md:p-10">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-on-surface">Check your inbox</h2>
                    <p className="mt-2 text-base text-on-surface-variant">
                        We sent a 6-digit code to{' '}
                        <span className="font-semibold text-on-surface">{activationEmail}</span>
                    </p>
                </div>

                {(error || localError) && (
                    <div
                        className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error"
                        role="alert"
                    >
                        {localError || error}
                    </div>
                )}

                {resendHint && (
                    <div
                        className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface"
                        role="status"
                    >
                        {resendHint}
                    </div>
                )}

                <form onSubmit={handleSubmitOtp} className="space-y-6">
                    <OtpBoxes
                        value={otp}
                        onChange={(v) => {
                            setOtp(v);
                            clearErrors();
                            setResendHint(null);
                        }}
                        disabled={verifyEmailLoading}
                    />
                    {fieldErrors.otp && (
                        <p className="text-center text-xs text-error">{fieldErrors.otp}</p>
                    )}

                    <button
                        type="submit"
                        disabled={verifyEmailLoading}
                        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <span>{verifyEmailLoading ? 'Verifying…' : 'Verify Account'}</span>
                        {!verifyEmailLoading && (
                            <span className="material-symbols-outlined text-[20px]">verified</span>
                        )}
                    </button>

                    <p className="text-center text-sm text-on-surface-variant">
                        Didn&apos;t get the code?{' '}
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendOtpLoading || verifyEmailLoading}
                            className="font-semibold text-primary hover:underline disabled:opacity-60"
                        >
                            {resendOtpLoading ? 'Sending…' : 'Resend'}
                        </button>
                    </p>
                </form>

                <p className="text-center text-sm text-on-surface-variant">
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Back to login
                    </Link>
                </p>
            </div>
        );
    } else {
        content = (
            <div className="p-8 md:p-10">
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-on-surface">Create your account</h2>
                        <p className="mt-1 text-base text-on-surface-variant">
                            Join UTEShop — verification code sent to your email
                        </p>
                    </div>

                    {(error || localError) && (
                        <div
                            className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error"
                            role="alert"
                        >
                            {localError || error}
                        </div>
                    )}

                    <form onSubmit={handleSubmitRegister} className="space-y-4">
                        <AuthField
                            id="register-username"
                            label="Username"
                            icon="person"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                clearErrors();
                            }}
                            placeholder="3–50 characters"
                            autoComplete="username"
                            error={fieldErrors.username}
                        />

                        <AuthField
                            id="register-fullname"
                            label="Full name"
                            icon="badge"
                            value={fullName}
                            onChange={(e) => {
                                setFullName(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Nguyen Van A"
                            autoComplete="name"
                            error={fieldErrors.fullName}
                        />

                        <AuthField
                            id="register-email"
                            label="Student Email"
                            icon="alternate_email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                clearErrors();
                            }}
                            placeholder="sv@student.hcmute.edu.vn"
                            autoComplete="email"
                            error={fieldErrors.email}
                        />

                        <AuthField
                            id="register-student-id"
                            label="Student ID (optional)"
                            icon="numbers"
                            value={studentId}
                            onChange={(e) => {
                                setStudentId(e.target.value);
                                clearErrors();
                            }}
                            placeholder="21110001"
                            error={fieldErrors.studentId}
                        />

                        <AuthField
                            id="register-major"
                            label="Major (optional)"
                            icon="school"
                            as="select"
                            value={majorId}
                            onChange={(e) => {
                                setMajorId(e.target.value);
                                clearErrors();
                            }}
                            error={fieldErrors.majorId}
                        >
                            <option value="">Select your degree program</option>
                            {majors.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </AuthField>

                        <AuthField
                            id="register-password"
                            label="Password"
                            icon="lock"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Min. 8 chars, letter + number"
                            autoComplete="new-password"
                            error={fieldErrors.password}
                            rightSlot={passwordToggle(showPassword, setShowPassword)}
                        />

                        <AuthField
                            id="register-confirm"
                            label="Confirm password"
                            icon="lock"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Re-enter password"
                            autoComplete="new-password"
                            rightSlot={passwordToggle(showConfirmPassword, setShowConfirmPassword)}
                        />

                        <button
                            type="submit"
                            disabled={registerLoading}
                            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <span>{registerLoading ? 'Creating account…' : 'Create Account'}</span>
                            {!registerLoading && (
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            )}
                        </button>
                    </form>

                    <div className="relative flex items-center py-2">
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
        );
    }

    return (
        <AuthShell activeTab="signup" secondaryLink={loginSecondary}>
            {content}
        </AuthShell>
    );
};

export default RegisterPage;

