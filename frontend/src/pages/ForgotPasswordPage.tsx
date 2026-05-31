import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    forgotPasswordUser,
    resetPasswordUser,
    clearAuthError,
    clearResetPasswordSuccess
} from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';

const ForgotPasswordPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const {
        forgotPasswordLoading,
        resetPasswordLoading,
        forgotPasswordSuccess,
        resetPasswordSuccess,
        error,
        fieldErrors
    } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [cooldown]);

    useEffect(() => {
        return () => {
            dispatch(clearAuthError());
            dispatch(clearResetPasswordSuccess());
        };
    }, [dispatch]);

    const handleSendOtp = (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!email) {
            setLocalError('Vui lòng nhập email của bạn.');
            return;
        }
        setLocalError('');
        dispatch(forgotPasswordUser({ email }));
        setCooldown(60);
    };

    const handleResetPassword = (e: FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!otp || !newPassword || !confirmPassword) {
            setLocalError('Vui lòng điền đầy đủ thông tin.');
            return;
        }

        if (newPassword.length < 8) {
            setLocalError('Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }

        if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
            setLocalError('Mật khẩu mới phải chứa ít nhất một chữ cái và một chữ số.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setLocalError('Mật khẩu xác nhận không khớp.');
            return;
        }

        dispatch(resetPasswordUser({ email, otp, newPassword }));
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        setOtp(val);
        if (localError) setLocalError('');
        dispatch(clearAuthError());
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewPassword(e.target.value);
        if (localError) setLocalError('');
        dispatch(clearAuthError());
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
        if (localError) setLocalError('');
        dispatch(clearAuthError());
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quên Mật Khẩu</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Khôi phục quyền truy cập vào tài khoản của bạn
                    </p>
                </div>

                {(error || localError) && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-100 rounded-lg whitespace-pre-line">
                        {localError || error}
                    </div>
                )}

                {resetPasswordSuccess ? (
                    <div className="text-center">
                        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-sm border border-emerald-100 rounded-lg">
                            Mật khẩu của bạn đã được đặt lại thành công!
                        </div>
                        <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
                            Quay lại Đăng nhập
                        </Button>
                    </div>
                ) : (
                    <>
                        {!forgotPasswordSuccess ? (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <p className="text-sm text-slate-600 mb-2">
                                    Vui lòng nhập địa chỉ email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi một
                                    mã OTP để xác nhận.
                                </p>
                                <InputField
                                    label="Email của bạn"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (localError) setLocalError('');
                                        dispatch(clearAuthError());
                                    }}
                                    placeholder="Nhập email..."
                                />
                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-full"
                                        isLoading={forgotPasswordLoading}
                                        disabled={cooldown > 0}
                                    >
                                        {cooldown > 0
                                            ? `Gửi lại mã sau ${cooldown}s`
                                            : 'Gửi mã xác nhận'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4 border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <span>
                                        Mã xác nhận đã gửi đến <strong>{email}</strong>!
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleSendOtp()}
                                        disabled={cooldown > 0}
                                        className={`shrink-0 text-blue-600 underline text-xs font-semibold ${cooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-800'}`}
                                    >
                                        {cooldown > 0 ? `Chờ ${cooldown}s để gửi lại` : 'Gửi lại mã'}
                                    </button>
                                </div>
                                <InputField
                                    label="Mã OTP (6 chữ số)"
                                    name="otp"
                                    value={otp}
                                    onChange={handleOtpChange}
                                    placeholder="Nhập mã OTP..."
                                    error={fieldErrors.otp}
                                />
                                <InputField
                                    label="Mật khẩu mới"
                                    name="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Nhập mật khẩu mới..."
                                    error={fieldErrors.newPassword}
                                />
                                <InputField
                                    label="Xác nhận mật khẩu mới"
                                    name="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={handleConfirmPasswordChange}
                                    placeholder="Nhập lại mật khẩu..."
                                    error={fieldErrors.confirmPassword}
                                />
                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-full"
                                        isLoading={resetPasswordLoading}
                                    >
                                        Xác nhận đổi mật khẩu
                                    </Button>
                                </div>
                            </form>
                        )}
                        <p className="mt-6 text-center text-sm text-slate-600">
                            Nhớ lại mật khẩu?{' '}
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Quay lại đăng nhập
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
