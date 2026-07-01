import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAppSelector } from '../../store/hooks';
import axiosInstance from '../../services/axiosConfig';
import OtpBoxes from '../auth/OtpBoxes';

interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
    const { user } = useAppSelector((state) => state.profile);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [otpSentHint, setOtpSentHint] = useState<string | null>(null);
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (otpCooldown > 0) {
            timer = setInterval(() => {
                setOtpCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [otpCooldown]);

    useEffect(() => {
        if (open) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setOtp('');
            setOtpCooldown(0);
            setOtpSentHint(null);
            setLocalError(null);
            setUpdateSuccess(false);
        }
    }, [open]);

    if (!open) return null;

    const handleSendOtp = async () => {
        setIsSendingOtp(true);
        setOtpSentHint(null);
        setLocalError(null);

        try {
            await axiosInstance.post('/users/profile/change-password/request-otp');
            setOtpSentHint('Mã OTP xác thực đổi mật khẩu đã được gửi đến email của bạn.');
            setOtpCooldown(60);
        } catch (err: unknown) {
            const apiErr = err as { message?: string; response?: { data?: { message?: string } } };
            const errorMsg = apiErr.response?.data?.message || apiErr.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
            setLocalError(errorMsg);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setUpdateSuccess(false);

        if (!currentPassword) {
            setLocalError('Vui lòng nhập mật khẩu hiện tại.');
            return;
        }
        if (newPassword.length < 6) {
            setLocalError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setLocalError('Mật khẩu mới và mật khẩu xác nhận không trùng khớp.');
            return;
        }
        if (!otp || otp.trim().length !== 6) {
            setLocalError('Vui lòng nhập đủ 6 chữ số mã OTP để xác nhận.');
            return;
        }

        setIsUpdating(true);
        try {
            await axiosInstance.put('/users/profile/change-password', {
                currentPassword,
                newPassword,
                otp
            });
            setUpdateSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: unknown) {
            const apiErr = err as { message?: string; response?: { data?: { message?: string } } };
            const errorMsg = apiErr.response?.data?.message || apiErr.message || 'Thay đổi mật khẩu thất bại. Vui lòng thử lại.';
            setLocalError(errorMsg);
        } finally {
            setIsUpdating(false);
        }
    };

    const inputClass =
        'h-12 w-full rounded-xl border-none bg-surface-container px-4 text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close"
            />
            <div className="relative z-10 w-full max-w-lg rounded-[24px] bg-surface-container-lowest p-8 soft-shadow">
                <div className="mb-6 flex items-center justify-between">
                    <h2 id="change-password-title" className="text-2xl font-semibold text-on-surface">
                        Thay đổi mật khẩu
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {localError && (
                    <div className="mb-4 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                        {localError}
                    </div>
                )}
                {updateSuccess && (
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary font-medium">
                        Mật khẩu đã được thay đổi thành công!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Mật khẩu hiện tại
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                if (localError) setLocalError(null);
                            }}
                            className={inputClass}
                            placeholder="Nhập mật khẩu hiện tại của bạn"
                        />
                    </div>
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Mật khẩu mới
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (localError) setLocalError(null);
                            }}
                            className={inputClass}
                            placeholder="Tối thiểu 6 ký tự"
                        />
                    </div>
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Xác nhận mật khẩu mới
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (localError) setLocalError(null);
                            }}
                            className={inputClass}
                            placeholder="Nhập lại mật khẩu mới"
                        />
                    </div>

                    <div className="border-t border-outline-variant/30 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="ml-1 block text-xs font-bold text-on-surface-variant">
                                Mã xác thực OTP (Gửi qua Email {user?.email})
                            </label>
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={otpCooldown > 0 || isSendingOtp}
                                className="text-xs font-bold text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                            >
                                {otpCooldown > 0 ? (
                                    <>
                                        <span className="material-symbols-outlined text-[14px]">timer</span>
                                        Gửi lại sau {otpCooldown}s
                                    </>
                                ) : isSendingOtp ? (
                                    'Đang gửi...'
                                ) : (
                                    'Nhận mã OTP'
                                )}
                            </button>
                        </div>
                        
                        <OtpBoxes
                            value={otp}
                            onChange={(otpVal) => {
                                setOtp(otpVal);
                                if (localError) setLocalError(null);
                            }}
                            disabled={isUpdating}
                        />

                        {otpSentHint && (
                            <p className="mt-2 text-xs font-medium text-primary bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">
                                {otpSentHint}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-surface-container-low text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating || updateSuccess}
                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary transition hover:shadow-lg disabled:opacity-70"
                        >
                            {isUpdating ? 'Đang lưu…' : 'Cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
