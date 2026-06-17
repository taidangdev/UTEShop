import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateUserProfile, clearStatus } from '../../store/profileSlice';
import type { ProfileUpdatePayload } from '../../types/profile';
import InputField from '../common/InputField';
import Button from '../common/Button';

const ProfileForm = () => {
    const dispatch = useAppDispatch();
    const { user, isUpdating, error, updateSuccess } = useAppSelector((state) => state.profile);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (updateSuccess || error) {
            dispatch(clearStatus());
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const payload: ProfileUpdatePayload = {
            fullName: formData.fullName,
            phone: formData.phone
        };
        dispatch(updateUserProfile(payload));
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto mt-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Chỉnh sửa hồ sơ</h2>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
            {updateSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
                    Cập nhật hồ sơ thành công!
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Họ và tên"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Nhập họ và tên..."
                    />
                    <InputField
                        label="Email (Không thể thay đổi)"
                        name="email"
                        type="email"
                        value={formData.email}
                        readOnly={true}
                    />
                </div>

                <InputField
                    label="Số điện thoại"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Nhập số điện thoại..."
                />



                <div className="mt-6 flex justify-end">
                    <Button type="submit" variant="primary" isLoading={isUpdating}>
                        Lưu Thay Đổi
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ProfileForm;
