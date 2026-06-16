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
import { fetchMyAddresses } from '../services/addressApi';
import type { UserAddress } from '../types/address';

interface ProfileUser {
    fullName?: string | null;
    phone?: string | null;
    studentId?: string | null;
    address?: string | null;
}

const inputClass =
    'h-12 rounded-lg border border-outline-variant bg-white px-4 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary';

export default function CheckoutInformationPage() {
    const navigate = useNavigate();
    const { items: cartItems, loading: cartLoading } = useCheckoutCart();
    const [information, setInformation] = useState<CheckoutInformation>(() => getCheckoutInformation());
    const [formError, setFormError] = useState<string | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [showAddressForm, setShowAddressForm] = useState(true);
    const [saveNewAddress, setSaveNewAddress] = useState(false);
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
    };

    const handleSelectNewAddress = () => {
        setSelectedAddressId(null);
        setShowAddressForm(true);
        setInformation((prev) => ({
            ...prev,
            addressId: null,
            fullName: '',
            phone: '',
            street: '',
            city: '',
            state: '',
            postalCode: '',
            deliveryType: 'home'
        }));
    };

    const handleSaveNewAddressChange = (checked: boolean) => {
        setSaveNewAddress(checked);
        updateField('saveAddress', checked);
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
        if (!information.fullName.trim()) return 'Họ và tên là bắt buộc';
        if (!information.phone.trim()) return 'Số điện thoại là bắt buộc';
        if (!information.street.trim()) return 'Địa chỉ chi tiết / Tòa nhà là bắt buộc';
        if (!information.city.trim()) return 'Thành phố là bắt buộc';
        if (!information.state.trim()) return 'Tỉnh / Thành phố là bắt buộc';
        if (!information.postalCode.trim()) return 'Mã bưu điện là bắt buộc';
        return null;
    };

    const handleContinue = (e: FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setFormError(err);
            return;
        }
        saveCheckoutInformation(information);
        navigate('/checkout/payment');
    };

    if (!cartLoading && items.length === 0) {
        return (
            <div className="min-h-screen bg-surface px-6 py-20 text-center">
                <p className="text-lg text-on-surface-variant">No items selected for checkout.</p>
                <Link to="/cart" className="mt-6 inline-block text-primary hover:underline">
                    Back to Cart
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
                            Back to Cart
                        </Link>
                        <span className="material-symbols-outlined text-outline">lock</span>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
                <CheckoutStepper currentStep={1} />

                {formError && (
                    <p className="mb-6 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        {formError}
                    </p>
                )}

                {previewError && (
                    <p className="mb-6 rounded-lg bg-error-container/80 px-4 py-3 text-sm text-on-error-container">
                        {previewError}
                    </p>
                )}

                <form onSubmit={handleContinue} className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <div className="space-y-12 lg:col-span-8">
                        <section className="space-y-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    <h2 className="text-3xl font-semibold text-on-surface">Customer Information</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="px-1 text-sm font-medium text-on-surface-variant">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={information.fullName}
                                            onChange={(e) => updateField('fullName', e.target.value)}
                                            placeholder="John Doe"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="px-1 text-sm font-medium text-on-surface-variant">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={information.phone}
                                            onChange={(e) => updateField('phone', e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="px-1 text-sm font-medium text-on-surface-variant">
                                        Student ID{' '}
                                        <span className="text-xs font-normal text-outline">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={information.studentId}
                                        onChange={(e) => updateField('studentId', e.target.value)}
                                        placeholder="e.g. 202488392"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                                    <h2 className="text-3xl font-semibold text-on-surface">Delivery Address</h2>
                                </div>

                                {isLoggedIn && savedAddresses.length > 0 && (
                                    <div className="mb-8 space-y-4">
                                        <label className="px-1 text-sm font-medium text-on-surface-variant">
                                            Chọn địa chỉ giao hàng đã lưu
                                        </label>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {savedAddresses.map((addr) => {
                                                const isSelected = selectedAddressId === addr.id;
                                                return (
                                                    <button
                                                        key={addr.id}
                                                        type="button"
                                                        onClick={() => handleSelectSavedAddress(addr)}
                                                        className={`group relative flex flex-col rounded-xl border-2 p-5 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                                : 'border-outline-variant bg-white hover:border-primary/50'
                                                        }`}
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
                                                        </div>
                                                    </button>
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
                                    <div className="space-y-6">
                                        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => updateField('deliveryType', 'campus')}
                                                className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                                                    information.deliveryType === 'campus'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-outline-variant bg-white hover:border-primary/50'
                                                }`}
                                            >
                                                <span
                                                    className="material-symbols-outlined text-primary"
                                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                                >
                                                    school
                                                </span>
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">Campus Delivery</p>
                                                    <p className="text-xs text-on-surface-variant">Free internal logistics</p>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('deliveryType', 'home')}
                                                className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                                                    information.deliveryType === 'home'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-outline-variant bg-white hover:border-primary/50'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-outline">home</span>
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">Home Delivery</p>
                                                    <p className="text-xs text-on-surface-variant">Standard shipping rates</p>
                                                </div>
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="px-1 text-sm font-medium text-on-surface-variant">
                                                Street Address / Campus Building
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={information.street}
                                                onChange={(e) => updateField('street', e.target.value)}
                                                placeholder="123 Engineering Way or Building A, Rm 402"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                            <div className="flex flex-col gap-2">
                                                <label className="px-1 text-sm font-medium text-on-surface-variant">
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={information.city}
                                                    onChange={(e) => updateField('city', e.target.value)}
                                                    placeholder="Tech City"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="px-1 text-sm font-medium text-on-surface-variant">
                                                    State / Province
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={information.state}
                                                    onChange={(e) => updateField('state', e.target.value)}
                                                    placeholder="State"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="px-1 text-sm font-medium text-on-surface-variant">
                                                    Postal Code
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={information.postalCode}
                                                    onChange={(e) => updateField('postalCode', e.target.value)}
                                                    placeholder="00000"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                        
                                        {isLoggedIn && (
                                            <div className="flex items-center gap-3 px-1 pt-2">
                                                <input
                                                    id="saveAddressCheckbox"
                                                    type="checkbox"
                                                    checked={saveNewAddress}
                                                    onChange={(e) => handleSaveNewAddressChange(e.target.checked)}
                                                    className="h-5 w-5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
                                                />
                                                <label htmlFor="saveAddressCheckbox" className="cursor-pointer text-sm font-medium text-on-surface-variant select-none">
                                                    Lưu địa chỉ này vào sổ địa chỉ của tôi để dùng cho lần sau
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="flex flex-col gap-4 border-t border-outline-variant/30 pt-8 md:flex-row">
                            <Link
                                to="/cart"
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-high text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Back to Cart
                            </Link>
                            <button
                                type="submit"
                                disabled={cartLoading || previewLoading}
                                className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-md transition hover:bg-primary-container disabled:opacity-50"
                            >
                                Continue to Payment
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
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
