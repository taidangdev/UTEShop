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
    title: 'Bạn đã có tài khoản?',
    subtitle: 'Đăng nhập để vào cổng thiết bị học tập.'
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
            setLocalError('Mật khẩu xác nhận không khớp.');
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
            setLocalError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
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
            setResendHint('Mã xác thực mới đã được gửi. Vui lòng kiểm tra email sinh viên.');
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
                    <h2 className="text-2xl font-semibold text-on-surface">Xác thực tài khoản thành công</h2>
                    <p className="mt-2 text-base text-on-surface-variant">
                        Email của bạn đã được xác nhận. Bạn có thể đăng nhập ngay.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        navigate('/login', { replace: true, state: { justActivated: true } })
                    }
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95"
                >
                    <span>Tiếp tục Đăng nhập</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
            </div>
        );
    } else if (showOtpStep) {
        content = (
            <div className="space-y-6 p-8 md:p-10">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-on-surface">Kiểm tra hộp thư của bạn</h2>
                    <p className="mt-2 text-base text-on-surface-variant">
                        Chúng tôi đã gửi mã xác thực 6 chữ số đến{' '}
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
                        <span>{verifyEmailLoading ? 'Đang xác thực…' : 'Xác thực tài khoản'}</span>
                        {!verifyEmailLoading && (
                            <span className="material-symbols-outlined text-[20px]">verified</span>
                        )}
                    </button>

                    <p className="text-center text-sm text-on-surface-variant">
                        Chưa nhận được mã?{' '}
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendOtpLoading || verifyEmailLoading}
                            className="font-semibold text-primary hover:underline disabled:opacity-60"
                        >
                            {resendOtpLoading ? 'Đang gửi…' : 'Gửi lại'}
                        </button>
                    </p>
                </form>

                <p className="text-center text-sm text-on-surface-variant">
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Quay lại Đăng nhập
                    </Link>
                </p>
            </div>
        );
    } else {
        content = (
            <div className="p-8 md:p-10">
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-on-surface">Tạo tài khoản mới</h2>
                        <p className="mt-1 text-base text-on-surface-variant">
                            Tham gia UTEShop — mã xác thực sẽ được gửi tới email của bạn
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
                            label="Tên tài khoản"
                            icon="person"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Từ 3 đến 50 ký tự"
                            autoComplete="username"
                            error={fieldErrors.username}
                        />

                        <AuthField
                            id="register-fullname"
                            label="Họ và tên"
                            icon="badge"
                            value={fullName}
                            onChange={(e) => {
                                setFullName(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Nguyễn Văn A"
                            autoComplete="name"
                            error={fieldErrors.fullName}
                        />

                        <AuthField
                            id="register-email"
                            label="Email sinh viên"
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
                            label="Mã số sinh viên (tùy chọn)"
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
                            label="Ngành học (tùy chọn)"
                            icon="school"
                            as="select"
                            value={majorId}
                            onChange={(e) => {
                                setMajorId(e.target.value);
                                clearErrors();
                            }}
                            error={fieldErrors.majorId}
                        >
                            <option value="">Chọn ngành học của bạn</option>
                            {majors.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </AuthField>

                        <AuthField
                            id="register-password"
                            label="Mật khẩu"
                            icon="lock"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Tối thiểu 8 ký tự, gồm cả chữ và số"
                            autoComplete="new-password"
                            error={fieldErrors.password}
                            rightSlot={passwordToggle(showPassword, setShowPassword)}
                        />

                        <AuthField
                            id="register-confirm"
                            label="Xác nhận mật khẩu"
                            icon="lock"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                clearErrors();
                            }}
                            placeholder="Nhập lại mật khẩu"
                            autoComplete="new-password"
                            rightSlot={passwordToggle(showConfirmPassword, setShowConfirmPassword)}
                        />

                        <button
                            type="submit"
                            disabled={registerLoading}
                            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <span>{registerLoading ? 'Đang tạo tài khoản…' : 'Đăng ký'}</span>
                            {!registerLoading && (
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            )}
                        </button>
                    </form>

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

