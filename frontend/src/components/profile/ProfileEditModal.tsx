import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateUserProfile, clearStatus } from '../../store/profileSlice';
import type { ProfileUpdatePayload } from '../../types/profile';

interface ProfileEditModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ProfileEditModal({ open, onClose }: ProfileEditModalProps) {
    const dispatch = useAppDispatch();
    const { user, isUpdating, error, updateSuccess } = useAppSelector((state) => state.profile);

    const [formData, setFormData] = useState<ProfileUpdatePayload>({
        fullName: '',
        phone: ''
    });

    useEffect(() => {
        if (user && open) {
            setFormData({
                fullName: user.fullName || '',
                phone: user.phone || ''
            });
        }
    }, [user, open]);

    useEffect(() => {
        if (updateSuccess) {
            const t = setTimeout(() => {
                dispatch(clearStatus());
                onClose();
            }, 1200);
            return () => clearTimeout(t);
        }
    }, [updateSuccess, dispatch, onClose]);

    if (!open) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (updateSuccess || error) dispatch(clearStatus());
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        dispatch(updateUserProfile(formData));
    };

    const inputClass =
        'h-12 w-full rounded-xl border-none bg-surface-container px-4 text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close"
            />
            <div className="relative z-10 w-full max-w-lg rounded-[24px] bg-surface-container-lowest p-8 soft-shadow">
                <div className="mb-6 flex items-center justify-between">
                    <h2 id="edit-profile-title" className="text-2xl font-semibold text-on-surface">
                        Edit Profile
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

                {error && (
                    <div className="mb-4 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                        {error}
                    </div>
                )}
                {updateSuccess && (
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
                        Profile updated successfully.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Full name
                        </label>
                        <input
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Email
                        </label>
                        <input
                            value={user?.email || ''}
                            readOnly
                            className={`${inputClass} opacity-70`}
                        />
                    </div>
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Phone
                        </label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Phone number"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-surface-container-low text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary transition hover:shadow-lg disabled:opacity-70"
                        >
                            {isUpdating ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

