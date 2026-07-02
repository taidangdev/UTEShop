import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CheckoutFooter from '../components/checkout/CheckoutFooter';
import CheckoutOrderSummary from '../components/checkout/CheckoutOrderSummary';
import CheckoutStepper from '../components/checkout/CheckoutStepper';
import { useCheckoutCart } from '../hooks/useCheckoutCart';
import { useCheckoutPreview } from '../hooks/useCheckoutPreview';
import axiosInstance from '../services/axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { CheckoutInformation } from '../types/checkout';
import { fetchMyCoupons, fetchMyPoints } from '../services/reviewApi';
import { fetchActivePromotions, validatePromotionCode } from '../services/promotionApi';
import type { ShopPromotion } from '../types/promotion';
import { getAccessToken } from '../services/authSession';
import type { UserCoupon } from '../types/review';
import {
    getCheckoutInformation,
    getCheckoutProductIds,
    hasCheckoutSelection,
    saveCheckoutInformation
} from '../utils/checkoutStorage';
import { fetchMyAddresses, updateUserAddress, createUserAddress } from '../services/addressApi';
import type { UserAddress } from '../types/address';

interface ProfileUser {
    fullName?: string | null;
    phone?: string | null;
    studentId?: string | null;
    address?: string | null;
}

const inputClass =
    'h-12 w-full rounded-lg border border-outline-variant bg-white px-4 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary text-sm';

export default function CheckoutInformationPage() {
    const navigate = useNavigate();
    const { items: cartItems, loading: cartLoading } = useCheckoutCart();
    const [information, setInformation] = useState<CheckoutInformation>(() => getCheckoutInformation());
    const [formError, setFormError] = useState<string | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [showAddressForm, setShowAddressForm] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [pointsBalance, setPointsBalance] = useState(0);
    const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
    const [shopPromotions, setShopPromotions] = useState<ShopPromotion[]>([]);
    const [promotionsLoading, setPromotionsLoading] = useState(true);
    const [promotionApplying, setPromotionApplying] = useState(false);
    const {
        items,
        totals,
        loading: previewLoading,
        error: previewError,
        maxPointsRedeemable
    } = useCheckoutPreview(information, cartItems);

    // Vietnam Administrative Divisions States
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [recipientName, setRecipientName] = useState(() => information.fullName || '');
    const [phone, setPhone] = useState(() => information.phone || '');
    const [line1, setLine1] = useState(() => information.street || '');
    const [line2, setLine2] = useState(() => information.postalCode || '');
    const [city, setCity] = useState(() => information.city || '');
    const [district, setDistrict] = useState(() => information.state || '');
    const [label, setLabel] = useState<'home' | 'campus' | 'work' | 'other'>(() => 
        information.deliveryType === 'campus' ? 'campus' : 'home'
    );

    const [provincesList, setProvincesList] = useState<Array<{ code: number; name: string }>>([]);
    const [districtsList, setDistrictsList] = useState<Array<{ code: number; name: string }>>([]);
    const [wardsList, setWardsList] = useState<Array<{ code: number; name: string }>>([]);

    const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
    const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
    const [ward, setWard] = useState<string>('');

    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    // Fetch provinces when form is shown
    useEffect(() => {
        if (!showAddressForm) return;

        const fetchProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const res = await fetch('https://provinces.open-api.vn/api/p/');
                const data = await res.json();
                setProvincesList(data || []);
            } catch (err) {
                console.error('Failed to fetch provinces', err);
            } finally {
                setLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, [showAddressForm]);

    // Fetch districts when selected province changes
    useEffect(() => {
        if (!selectedProvinceCode) {
            setDistrictsList([]);
            setWardsList([]);
            setSelectedDistrictCode('');
            return;
        }

        const fetchDistricts = async () => {
            setLoadingDistricts(true);
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`);
                const data = await res.json();
                setDistrictsList(data.districts || []);
                setWardsList([]);
                setSelectedDistrictCode('');
            } catch (err) {
                console.error('Failed to fetch districts', err);
            } finally {
                setLoadingDistricts(false);
            }
        };
        fetchDistricts();
    }, [selectedProvinceCode]);

    // Fetch wards when selected district changes
    useEffect(() => {
        if (!selectedDistrictCode) {
            setWardsList([]);
            return;
        }

        const fetchWards = async () => {
            setLoadingWards(true);
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`);
                const data = await res.json();
                setWardsList(data.wards || []);
            } catch (err) {
                console.error('Failed to fetch wards', err);
            } finally {
                setLoadingWards(false);
            }
        };
        fetchWards();
    }, [selectedDistrictCode]);

    // Sync selectedProvinceCode when city is populated (for editing)
    useEffect(() => {
        if (provincesList.length > 0 && city && !selectedProvinceCode) {
            const found = provincesList.find((p) => p.name === city);
            if (found) {
                setSelectedProvinceCode(String(found.code));
            }
        }
    }, [provincesList, city]);

    // Sync selectedDistrictCode when district is populated (for editing)
    useEffect(() => {
        if (districtsList.length > 0 && district && !selectedDistrictCode) {
            const found = districtsList.find((d) => d.name === district);
            if (found) {
                setSelectedDistrictCode(String(found.code));
            }
        }
    }, [districtsList, district]);

    // Sync form inputs to checkout information state
    useEffect(() => {
        if (!showAddressForm) return;
        setInformation((prev) => ({
            ...prev,
            fullName: recipientName,
            phone: phone,
            street: line1,
            city: city,
            state: district,
            postalCode: line2,
            deliveryType: label === 'campus' ? 'campus' : 'home'
        }));
    }, [showAddressForm, recipientName, phone, line1, line2, city, district, label]);

    useEffect(() => {
        if (!hasCheckoutSelection()) {
            navigate('/cart', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        let cancelled = false;
        async function loadProfileAndAddresses() {
            const token = getAccessToken();
            if (!token) {
                setShowAddressForm(true);
                return;
            }
            setIsLoggedIn(true);
            try {
                // Fetch profile
                const profileRes = await axiosInstance.get<ApiEnvelope<{ user: ProfileUser }>>('/users/me');
                if (cancelled) return;
                const u = profileRes.data.user;

                // Fetch addresses
                const list = await fetchMyAddresses();
                if (cancelled) return;

                setSavedAddresses(list);
                if (list.length > 0) {
                    const defaultAddr = list.find((a) => a.isDefault) || list[0];
                    setSelectedAddressId(defaultAddr.id);
                    setShowAddressForm(false);
                    setInformation((prev) => ({
                        ...prev,
                        addressId: defaultAddr.id,
                        fullName: prev.fullName || defaultAddr.recipientName || u.fullName || '',
                        phone: prev.phone || defaultAddr.phone || u.phone || '',
                        street: prev.street || defaultAddr.line1 || u.address || '',
                        city: prev.city || defaultAddr.city || '',
                        state: prev.state || defaultAddr.district || '',
                        postalCode: prev.postalCode || defaultAddr.line2 || '',
                        deliveryType: defaultAddr.ward === 'Campus Delivery' ? 'campus' : 'home',
                        studentId: prev.studentId || u.studentId || ''
                    }));
                } else {
                    setShowAddressForm(true);
                    setInformation((prev) => ({
                        ...prev,
                        fullName: prev.fullName || u.fullName || '',
                        phone: prev.phone || u.phone || '',
                        street: prev.street || u.address || '',
                        studentId: prev.studentId || u.studentId || ''
                    }));
                    setRecipientName(prev => prev || u.fullName || '');
                    setPhone(prev => prev || u.phone || '');
                    setLine1(prev => prev || u.address || '');
                }
            } catch (err) {
                if (cancelled) return;
                setShowAddressForm(true);
            }
        }
        loadProfileAndAddresses();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSelectSavedAddress = (addr: UserAddress) => {
        setSelectedAddressId(addr.id);
        setShowAddressForm(false);
        setEditingAddressId(null);
        setInformation((prev) => ({
            ...prev,
            addressId: addr.id,
            fullName: addr.recipientName,
            phone: addr.phone,
            street: addr.line1,
            city: addr.city,
            state: addr.district || '',
            postalCode: addr.line2 || '',
            deliveryType: addr.ward === 'Campus Delivery' ? 'campus' : 'home'
        }));

        setRecipientName(addr.recipientName);
        setPhone(addr.phone);
        setLine1(addr.line1);
        setLine2(addr.line2 || '');
        setWard(addr.ward || '');
        setDistrict(addr.district || '');
        setCity(addr.city);
        if (addr.label === 'home' || addr.label === 'work' || addr.label === 'campus' || addr.label === 'other') {
            setLabel(addr.label);
        } else {
            setLabel('home');
        }

        // Reset code select state when switching to saved address
        setSelectedProvinceCode('');
        setSelectedDistrictCode('');
        setDistrictsList([]);
        setWardsList([]);
    };

    const handleSelectNewAddress = () => {
        setSelectedAddressId(null);
        setEditingAddressId(null);
        setRecipientName('');
        setPhone('');
        setLine1('');
        setLine2('');
        setWard('');
        setDistrict('');
        setCity('');
        setSelectedProvinceCode('');
        setSelectedDistrictCode('');
        setDistrictsList([]);
        setWardsList([]);
        setLabel('home');
        setShowAddressForm(true);
    };

    const handleEditSavedAddress = (addr: UserAddress) => {
        setSelectedAddressId(null);
        setEditingAddressId(addr.id);
        setRecipientName(addr.recipientName);
        setPhone(addr.phone);
        setLine1(addr.line1);
        setLine2(addr.line2 || '');
        setWard(addr.ward || '');
        setDistrict(addr.district || '');
        setCity(addr.city);
        if (addr.label === 'home' || addr.label === 'work' || addr.label === 'campus' || addr.label === 'other') {
            setLabel(addr.label);
        } else {
            setLabel('home');
        }
        setSelectedProvinceCode('');
        setSelectedDistrictCode('');
        setDistrictsList([]);
        setWardsList([]);
        setShowAddressForm(true);
    };

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        setSelectedProvinceCode(code);
        const prov = provincesList.find((p) => String(p.code) === code);
        setCity(prov ? prov.name : '');
        setDistrict('');
        setWard('');
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        setSelectedDistrictCode(code);
        const dist = districtsList.find((d) => String(d.code) === code);
        setDistrict(dist ? dist.name : '');
        setWard('');
    };

    const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        const wd = wardsList.find((w) => String(w.code) === code);
        setWard(wd ? wd.name : '');
    };

    useEffect(() => {
        if (!getAccessToken()) return;
        let cancelled = false;
        async function loadRewards() {
            try {
                const [pointsData, coupons] = await Promise.all([
                    fetchMyPoints(),
                    fetchMyCoupons()
                ]);
                if (!cancelled) {
                    setPointsBalance(pointsData.balance);
                    setUserCoupons(coupons);
                }
            } catch {
                // Guest or rewards unavailable
            }
        }
        loadRewards();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadPromotions() {
            setPromotionsLoading(true);
            try {
                const list = await fetchActivePromotions();
                if (!cancelled) setShopPromotions(list);
            } catch {
                if (!cancelled) setShopPromotions([]);
            } finally {
                if (!cancelled) setPromotionsLoading(false);
            }
        }
        loadPromotions();
        return () => {
            cancelled = true;
        };
    }, []);

    const updateField = <K extends keyof CheckoutInformation>(key: K, value: CheckoutInformation[K]) => {
        setInformation((prev) => ({ ...prev, [key]: value }));
    };

    const clearPromotion = () => {
        setInformation((prev) => ({
            ...prev,
            appliedDiscountCode: '',
            discountCode: ''
        }));
        setPromotionMessage(null);
    };

    const applyPromotionByCode = async (code: string) => {
        const productIds = getCheckoutProductIds();
        setPromotionApplying(true);
        try {
            const result = await validatePromotionCode(code, productIds);
            if (!result.valid) {
                setPromotionMessage(result.message || 'Mã không hợp lệ với giỏ hàng hiện tại');
                return false;
            }
            setPromotionMessage(
                `✓ ${result.promotion?.name || code} — giảm $${result.promotionDiscount?.toFixed(2) ?? '0'}${
                    result.freeShipping ? ', miễn phí ship' : ''
                }`
            );
            setInformation((prev) => ({
                ...prev,
                appliedDiscountCode: code,
                discountCode: code
            }));
            return true;
        } catch (err) {
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { message?: string })?.message || 'Không thể áp dụng mã';
            setPromotionMessage(msg);
            return false;
        } finally {
            setPromotionApplying(false);
        }
    };

    const handlePromotionSelect = async (code: string) => {
        if (!code) {
            clearPromotion();
            return;
        }
        if (code === information.appliedDiscountCode) return;
        setInformation((prev) => ({ ...prev, discountCode: code }));
        await applyPromotionByCode(code);
    };

    const validate = () => {
        if (selectedAddressId !== null) return null;
        if (!recipientName.trim()) return 'Họ và tên người nhận là bắt buộc';
        if (!phone.trim()) return 'Số điện thoại nhận hàng là bắt buộc';

        const phoneRegex = /^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/;
        if (!phoneRegex.test(phone.trim())) {
            return 'Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678)';
        }

        if (!line1.trim()) return 'Địa chỉ chi tiết là bắt buộc';
        if (!city.trim()) return 'Tỉnh / Thành phố là bắt buộc';
        if (!district.trim()) return 'Quận / Huyện là bắt buộc';
        if (!ward.trim()) return 'Phường / Xã là bắt buộc';
        return null;
    };

    const handleSaveAddressDb = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const err = validate();
        if (err) {
            setFormError(err);
            return;
        }

        try {
            const payload = {
                recipientName: recipientName.trim(),
                phone: phone.trim(),
                line1: line1.trim(),
                line2: line2.trim() || undefined,
                ward: ward.trim() || undefined,
                district: district.trim() || undefined,
                city: city.trim(),
                isDefault: false,
                label
            };

            if (editingAddressId !== null) {
                await updateUserAddress(editingAddressId, payload);
            } else {
                await createUserAddress(payload);
            }

            const list = await fetchMyAddresses();
            setSavedAddresses(list);

            let selectedAddr = list[0];
            if (editingAddressId !== null) {
                selectedAddr = list.find((a) => a.id === editingAddressId) || list[0];
            } else {
                selectedAddr = list.find((a) => a.recipientName === payload.recipientName && a.line1 === payload.line1) || list[0];
            }

            if (selectedAddr) {
                setSelectedAddressId(selectedAddr.id);
                setInformation((prev) => ({
                    ...prev,
                    addressId: selectedAddr.id,
                    fullName: selectedAddr.recipientName,
                    phone: selectedAddr.phone,
                    street: selectedAddr.line1,
                    city: selectedAddr.city,
                    state: selectedAddr.district || '',
                    postalCode: selectedAddr.line2 || '',
                    deliveryType: selectedAddr.ward === 'Campus Delivery' ? 'campus' : 'home'
                }));
            }

            setShowAddressForm(false);
            setEditingAddressId(null);
        } catch (err: any) {
            if (err && err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
                setFormError(err.errors.map((e: any) => e.msg).join(', '));
            } else {
                setFormError(err?.message || 'Có lỗi xảy ra khi xử lý địa chỉ.');
            }
        }
    };

    const handleContinue = async (e: FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setFormError(err);
            return;
        }

        saveCheckoutInformation(information);
        navigate('/checkout/payment');
    };

    if (!cartLoading && cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-surface px-6 py-20 text-center">
                <p className="text-lg text-on-surface-variant">Không có sản phẩm nào được chọn để thanh toán.</p>
                <Link to="/cart" className="mt-6 inline-block text-primary hover:underline">
                    Quay lại giỏ hàng
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <div className="border-b border-outline-variant/30 bg-surface/80 backdrop-blur-xl">
                <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
                    <Link to="/" className="text-2xl font-bold tracking-tight text-on-surface">
                        UTEShop
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link
                            to="/cart"
                            className="text-sm font-medium text-on-surface-variant transition hover:text-primary"
                        >
                            Quay lại giỏ hàng
                        </Link>
                        <span className="material-symbols-outlined text-outline">lock</span>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
                <CheckoutStepper currentStep={1} />

                {formError && (
                    <p className="mb-6 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                        {formError}
                    </p>
                )}

                {previewError && (
                    <p className="mb-6 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                        {previewError}
                    </p>
                )}

                <form onSubmit={showAddressForm && isLoggedIn ? handleSaveAddressDb : handleContinue} className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <div className="space-y-12 lg:col-span-8">
                        <section className="space-y-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                                    <h2 className="text-3xl font-semibold text-on-surface">
                                        Thông tin nhận hàng
                                    </h2>
                                </div>

                                {isLoggedIn && savedAddresses.length > 0 && !showAddressForm && (
                                    <div className="mb-8 space-y-4">
                                        <label className="px-1 text-sm font-medium text-on-surface-variant">
                                            Chọn địa chỉ giao hàng đã lưu
                                        </label>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {savedAddresses.map((addr) => {
                                                const isSelected = selectedAddressId === addr.id;
                                                return (
                                                    <div
                                                        key={addr.id}
                                                        className={`soft-shadow relative flex flex-col rounded-xl border-2 p-5 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                                : 'border-outline-variant bg-white hover:border-primary/50'
                                                        }`}
                                                    >
                                                        <div
                                                            onClick={() => handleSelectSavedAddress(addr)}
                                                            className="cursor-pointer flex-1"
                                                        >
                                                            <div className="flex items-start justify-between w-full">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`material-symbols-outlined text-lg ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                                                                        {addr.label === 'campus' ? 'school' : addr.label === 'work' ? 'work' : 'home'}
                                                                    </span>
                                                                    <span className="font-bold text-on-surface text-base">
                                                                        {addr.label === 'campus' ? 'Trường học' : addr.label === 'work' ? 'Công ty' : 'Nhà riêng'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    {addr.isDefault && (
                                                                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                                                            Mặc định
                                                                        </span>
                                                                    )}
                                                                    <span className={`material-symbols-outlined text-lg ${isSelected ? 'text-primary' : 'text-outline-variant group-hover:text-outline'}`}>
                                                                        {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 space-y-1 text-sm text-on-surface-variant">
                                                                <p className="font-semibold text-on-surface">{addr.recipientName}</p>
                                                                <p>{addr.phone}</p>
                                                                <p className="line-clamp-2">
                                                                    {addr.line1}
                                                                    {addr.ward ? `, ${addr.ward}` : ''}
                                                                    {addr.district ? `, ${addr.district}` : ''}
                                                                    {addr.city ? `, ${addr.city}` : ''}
                                                                </p>
                                                                {addr.line2 && <p className="text-xs italic mt-1 text-on-surface-variant/80">({addr.line2})</p>}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex justify-end border-t border-outline-variant/20 pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditSavedAddress(addr);
                                                                }}
                                                                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                Sửa địa chỉ
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <button
                                                type="button"
                                                onClick={handleSelectNewAddress}
                                                className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                                                    selectedAddressId === null
                                                        ? 'border-primary bg-primary/5 shadow-md'
                                                        : 'border-outline-variant bg-white hover:border-primary/50'
                                                }`}
                                            >
                                                <span className={`material-symbols-outlined text-2xl mb-2 ${selectedAddressId === null ? 'text-primary' : 'text-outline'}`}>
                                                    add_circle
                                                </span>
                                                <p className="text-sm font-bold text-on-surface">Nhập địa chỉ mới</p>
                                                <p className="text-xs text-on-surface-variant mt-1">Sử dụng địa chỉ giao hàng khác</p>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {showAddressForm && (
                                    <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30 space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-on-surface">
                                                {editingAddressId !== null ? 'Chỉnh sửa địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng'}
                                            </h3>
                                            {isLoggedIn && savedAddresses.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddressForm(false);
                                                        setEditingAddressId(null);
                                                        if (savedAddresses.length > 0) {
                                                            const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                                                            handleSelectSavedAddress(defaultAddr);
                                                        }
                                                    }}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Họ và tên người nhận
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={recipientName}
                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                    placeholder="Ví dụ: Nguyễn Văn A"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Số điện thoại nhận hàng
                                                </label>
                                                <input
                                                    type="tel"
                                                    required
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="Ví dụ: 0912345678"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                Địa chỉ chi tiết (Số nhà, Tên đường, Tòa nhà)
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={line1}
                                                onChange={(e) => setLine1(e.target.value)}
                                                placeholder="Ví dụ: 123 Đường Lê Lợi hoặc Phòng 402, Tòa nhà A"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Tỉnh / Thành phố
                                                </label>
                                                <select
                                                    required
                                                    value={selectedProvinceCode}
                                                    onChange={handleProvinceChange}
                                                    className={inputClass}
                                                >
                                                    <option value="">Chọn Tỉnh / Thành</option>
                                                    {loadingProvinces ? (
                                                        <option disabled>Đang tải...</option>
                                                    ) : (
                                                        provincesList.map((p) => (
                                                            <option key={p.code} value={p.code}>
                                                                {p.name}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Quận / Huyện
                                                </label>
                                                <select
                                                    required
                                                    disabled={!selectedProvinceCode}
                                                    value={selectedDistrictCode}
                                                    onChange={handleDistrictChange}
                                                    className={inputClass}
                                                >
                                                    <option value="">Chọn Quận / Huyện</option>
                                                    {loadingDistricts ? (
                                                        <option disabled>Đang tải...</option>
                                                    ) : (
                                                        districtsList.map((d) => (
                                                            <option key={d.code} value={d.code}>
                                                                {d.name}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Phường / Xã
                                                </label>
                                                <select
                                                    required
                                                    disabled={!selectedDistrictCode}
                                                    value={wardsList.find((w) => w.name === ward)?.code || ''}
                                                    onChange={handleWardChange}
                                                    className={inputClass}
                                                >
                                                    <option value="">Chọn Phường / Xã</option>
                                                    {loadingWards ? (
                                                        <option disabled>Đang tải...</option>
                                                    ) : (
                                                        wardsList.map((w) => (
                                                            <option key={w.code} value={w.code}>
                                                                {w.name}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Ghi chú (Tùy chọn)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={line2}
                                                    onChange={(e) => setLine2(e.target.value)}
                                                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                                    Loại địa chỉ
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {(['home', 'work', 'campus', 'other'] as const).map((type) => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setLabel(type)}
                                                            className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs font-medium transition-all ${
                                                                label === type
                                                                    ? 'border-primary bg-primary/5 text-primary'
                                                                    : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px] mb-0.5">
                                                                {type === 'home'
                                                                    ? 'home'
                                                                    : type === 'work'
                                                                      ? 'work'
                                                                      : type === 'campus'
                                                                        ? 'school'
                                                                        : 'tag'}
                                                            </span>
                                                            <span>
                                                                {type === 'home'
                                                                    ? 'Nhà riêng'
                                                                    : type === 'work'
                                                                      ? 'Công ty'
                                                                      : type === 'campus'
                                                                        ? 'Trường'
                                                                        : 'Khác'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="flex flex-col gap-4 border-t border-outline-variant/30 pt-8 md:flex-row">
                            {isLoggedIn && showAddressForm ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingAddressId(null);
                                            setShowAddressForm(false);
                                            if (savedAddresses.length > 0) {
                                                const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                                                handleSelectSavedAddress(defaultAddr);
                                            }
                                        }}
                                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-high text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={cartLoading || previewLoading}
                                        className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-md transition hover:bg-primary-container disabled:opacity-50"
                                    >
                                        {editingAddressId !== null ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
                                        <span className="material-symbols-outlined text-lg">save</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/cart"
                                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-high text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                                    >
                                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                                        Quay lại giỏ hàng
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={cartLoading || previewLoading}
                                        className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-md transition hover:bg-primary-container disabled:opacity-50"
                                    >
                                        Tiếp tục đến trang thanh toán
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        {cartLoading || previewLoading ? (
                            <div className="flex justify-center py-16">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            </div>
                        ) : (
                            <CheckoutOrderSummary
                                items={items}
                                totals={totals}
                                information={information}
                                showCoupons
                                shopPromotions={shopPromotions}
                                promotionsLoading={promotionsLoading}
                                promotionApplying={promotionApplying}
                                onPromotionSelect={handlePromotionSelect}
                                promotionMessage={promotionMessage}
                                userCoupons={userCoupons}
                                pointsBalance={pointsBalance}
                                maxPointsRedeemable={maxPointsRedeemable}
                                onUserCouponChange={(code) => updateField('userCouponCode', code)}
                                onPointsChange={(points) => updateField('pointsToRedeem', points)}
                            />
                        )}
                    </div>
                </form>
            </main>

            <CheckoutFooter />
        </div>
    );
}
