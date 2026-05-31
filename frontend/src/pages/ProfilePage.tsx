import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMyOrders, fetchMyReviews, fetchUserProfile } from '../store/profileSlice';
import { logout } from '../store/authSlice';
import ProfileEditModal from '../components/profile/ProfileEditModal';
import ProfileRewardsPanel from '../components/profile/ProfileRewardsPanel';
import WriteReviewModal from '../components/reviews/WriteReviewModal';
import { fetchMyCoupons, fetchMyPoints } from '../services/reviewApi';
import type { UserCoupon } from '../types/review';
import type { AuthUser } from '../types/auth';
import type { ProfileUser } from '../types/profile';

const DEFAULT_AVATAR =
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces';

const PROFILE_SECTIONS = ['overview', 'rewards', 'orders', 'reviews', 'settings'] as const;

const SIDEBAR_ITEMS = [
    { id: 'overview', label: 'Overview', icon: 'dashboard', filled: true },
    { id: 'orders', label: 'Order History', icon: 'shopping_bag' },
    { id: 'reviews', label: 'My Reviews', icon: 'reviews' },
    { id: 'settings', label: 'Account Settings', icon: 'settings' }
];

function displayName(user: ProfileUser | null, authUser: AuthUser | null) {
    return user?.fullName || user?.username || authUser?.username || 'Student';
}

function profileSubtitle(user: ProfileUser | null) {
    const major = user?.major?.name;
    const sid = user?.studentId;
    const parts = [];
    if (major) parts.push(major);
    if (sid) parts.push(`ID: ${sid}`);
    return parts.length ? parts.join(' • ') : user?.email || '';
}

function OrderProgress({ filled }: { filled: number }) {
    return (
        <div className="mt-6 flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
                <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                        i < filled ? 'bg-primary' : 'bg-surface-container'
                    }`}
                />
            ))}
        </div>
    );
}

function ProfileFooter() {
    return (
        <footer className="w-full bg-surface-container-low py-20">
            <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-6 md:grid-cols-4 lg:grid-cols-5 lg:px-8">
                <div className="col-span-2 lg:col-span-1">
                    <div className="mb-4 text-2xl font-bold text-on-surface">UTEShop</div>
                    <p className="text-xs text-on-surface-variant opacity-80">
                        Engineering-Grade Quality since 2018.
                    </p>
                </div>
                <div className="flex flex-col gap-4">
                    <h5 className="text-sm font-semibold text-primary">Shop</h5>
                    <a href="/#featured" className="text-xs text-on-surface-variant hover:text-primary">
                        Technology
                    </a>
                    <a href="/#featured" className="text-xs text-on-surface-variant hover:text-primary">
                        Textbooks
                    </a>
                    <a href="/#featured" className="text-xs text-on-surface-variant hover:text-primary">
                        Lab Gear
                    </a>
                </div>
                <div className="flex flex-col gap-4">
                    <h5 className="text-sm font-semibold text-primary">Support</h5>
                    <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                        Student Support
                    </a>
                    <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                        Shipping
                    </a>
                    <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                        Contact
                    </a>
                </div>
                <div className="flex flex-col gap-4">
                    <h5 className="text-sm font-semibold text-primary">Legal</h5>
                    <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                        Privacy Policy
                    </a>
                    <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                        Terms of Service
                    </a>
                </div>
                <div className="col-span-2 mt-10 border-t border-outline-variant pt-10 md:col-span-4 lg:col-span-1 lg:mt-0 lg:border-none lg:pt-0">
                    <p className="text-xs text-on-surface-variant">
                        © 2024 UTEShop. Engineering-Grade Quality.
                    </p>
                </div>
            </div>
        </footer>
    );
}

const ProfilePage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        user,
        stats,
        orders,
        reviews,
        isLoading,
        ordersLoading,
        reviewsLoading,
        error,
        ordersError,
        reviewsError
    } = useAppSelector((state) => state.profile);
    const authUser = useAppSelector((state) => state.auth.user);

    const [activeSection, setActiveSection] = useState('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [coupons, setCoupons] = useState<UserCoupon[]>([]);
    const [pointsBalance, setPointsBalance] = useState<number | null>(null);

    useEffect(() => {
        dispatch(fetchUserProfile());
        dispatch(fetchMyOrders());
        dispatch(fetchMyReviews());
    }, [dispatch]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && PROFILE_SECTIONS.includes(tab as (typeof PROFILE_SECTIONS)[number])) {
            setActiveSection(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        let cancelled = false;
        async function loadRewards() {
            try {
                const [pointsData, couponList] = await Promise.all([
                    fetchMyPoints(),
                    fetchMyCoupons()
                ]);
                if (!cancelled) {
                    setPointsBalance(pointsData.balance);
                    setCoupons(couponList);
                }
            } catch {
                if (!cancelled) {
                    setPointsBalance(stats?.loyaltyPoints ?? null);
                }
            }
        }
        if (user) loadRewards();
        return () => {
            cancelled = true;
        };
    }, [user, stats?.loyaltyPoints]);

    const refreshRewards = async () => {
        dispatch(fetchUserProfile());
        dispatch(fetchMyReviews());
        try {
            const [pointsData, couponList] = await Promise.all([
                fetchMyPoints(),
                fetchMyCoupons()
            ]);
            setPointsBalance(pointsData.balance);
            setCoupons(couponList);
        } catch {
            // ignore
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    const scrollTo = (id: string) => {
        if (id === 'orders') {
            navigate('/profile/orders');
        } else {
            setActiveSection(id);
            if (id === 'rewards') {
                navigate('/profile?tab=rewards', { replace: true });
            } else if (searchParams.get('tab')) {
                navigate('/profile', { replace: true });
            }
        }
    };

    const name = displayName(user, authUser);
    const avatarSrc = user?.avatarUrl || DEFAULT_AVATAR;
    const isVerified = Boolean(user?.emailVerifiedAt) || user?.status === 'active';

    return (
        <div className="overflow-x-hidden bg-surface text-on-surface">
            <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-10 lg:px-8">
                {isLoading ? (
                    <div className="flex justify-center py-32">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    </div>
                ) : error && !user ? (
                    <div className="rounded-[24px] border border-error/20 bg-red-50 p-8 text-center text-error">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() => dispatch(fetchUserProfile())}
                            className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-on-primary"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Profile hero */}
                        <section className="mb-12">
                            <div className="soft-shadow flex flex-col items-start justify-between gap-6 rounded-[24px] bg-surface-container-lowest p-8 md:flex-row md:items-center">
                                <div className="flex items-center gap-6">
                                    <div className="relative shrink-0">
                                        <img
                                            src={avatarSrc}
                                            alt=""
                                            className="h-24 w-24 rounded-[24px] object-cover md:h-32 md:w-32"
                                        />
                                        {isVerified && (
                                            <div className="absolute -bottom-2 -right-2 rounded-full border-4 border-surface-container-lowest bg-primary p-1.5 text-white">
                                                <span className="material-symbols-outlined material-symbols-filled text-[16px]">
                                                    verified
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-semibold text-on-surface">{name}</h1>
                                        <p className="mt-1 text-base text-on-surface-variant">
                                            {profileSubtitle(user)}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {user?.major?.name && (
                                                <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                                                    {user.major.name}
                                                </span>
                                            )}
                                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                                {user?.role === 'admin' ? 'Admin' : 'Prime Member'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex w-full flex-col gap-2 md:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setEditOpen(true)}
                                        className="flex h-14 items-center justify-center gap-2 rounded-[24px] bg-primary px-8 text-sm font-medium text-on-primary transition active:scale-95 hover:shadow-lg"
                                    >
                                        Edit Profile
                                    </button>
                                    <button
                                        type="button"
                                        className="flex h-14 items-center justify-center gap-2 rounded-[24px] bg-surface-container-low px-8 text-sm font-medium text-on-surface transition active:scale-95 hover:bg-surface-container-high"
                                    >
                                        Student ID Card
                                    </button>
                                </div>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
                            {/* Sidebar */}
                            <aside className="hidden lg:col-span-3 lg:block">
                                <nav className="sticky top-28 flex flex-col gap-2">
                                    {SIDEBAR_ITEMS.map((item) => {
                                        const active = activeSection === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => scrollTo(item.id)}
                                                className={`flex items-center gap-3 rounded-xl p-4 text-left transition-all ${
                                                    active
                                                        ? 'bg-primary font-bold text-on-primary shadow-sm'
                                                        : 'text-on-surface-variant hover:bg-surface-container-high'
                                                }`}
                                            >
                                                <span
                                                    className={`material-symbols-outlined ${
                                                        item.filled && active ? 'material-symbols-filled' : ''
                                                    }`}
                                                >
                                                    {item.icon}
                                                </span>
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                    <hr className="my-4 border-outline-variant" />
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 rounded-xl p-4 text-left text-error transition-all hover:bg-error/10"
                                    >
                                        <span className="material-symbols-outlined">logout</span>
                                        <span className="text-sm font-medium">Sign Out</span>
                                    </button>
                                </nav>
                            </aside>
                            {/* Main content */}
                            <div className="lg:col-span-9">
                                {/* Overview / mobile nav */}
                                {activeSection === 'overview' && (
                                    <section id="section-overview" className="flex flex-col gap-8">
                                        <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
                                            {SIDEBAR_ITEMS.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => scrollTo(item.id)}
                                                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                                                        activeSection === item.id
                                                            ? 'bg-primary text-on-primary'
                                                            : 'bg-surface-container-high text-on-surface-variant'
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            <div className="rounded-[24px] bg-surface-container-low p-6">
                                                <p className="text-xs font-semibold uppercase text-on-surface-variant">
                                                    Account
                                                </p>
                                                <p className="mt-2 text-sm text-on-surface">{user?.email}</p>
                                                <p className="mt-1 text-sm text-on-surface-variant">
                                                    {user?.phone || 'No phone on file'}
                                                </p>
                                            </div>
                                            <div className="rounded-[24px] bg-surface-container-low p-6">
                                                <p className="text-xs font-semibold uppercase text-on-surface-variant">
                                                    Orders
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold text-primary">
                                                    {stats?.orderCount ?? 0}
                                                </p>
                                            </div>
                                            <div className="rounded-[24px] bg-surface-container-low p-6">
                                                <p className="text-xs font-semibold uppercase text-on-surface-variant">
                                                    Reviews
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold text-primary">
                                                    {stats?.reviewCount ?? 0}
                                                </p>
                                            </div>
                                            <div className="rounded-[24px] bg-primary/10 p-6">
                                                <p className="text-xs font-semibold uppercase text-primary">
                                                    Loyalty points
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold text-primary">
                                                    {pointsBalance ?? stats?.loyaltyPoints ?? 0}
                                                </p>
                                                <p className="mt-1 text-xs text-on-surface-variant">
                                                    Redeem at checkout
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setReviewModalOpen(true)}
                                                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    rate_review
                                                </span>
                                                Write a Review
                                            </button>
                                            <Link
                                                to="/profile/orders"
                                                className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-6 py-3 text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                                            >
                                                View orders
                                            </Link>
                                        </div>
                                        {coupons.length > 0 && (
                                            <div className="rounded-[24px] bg-surface-container-lowest p-6">
                                                <h3 className="mb-4 text-lg font-semibold text-on-surface">
                                                    My reward coupons
                                                </h3>
                                                <ul className="flex flex-col gap-2">
                                                    {coupons.slice(0, 5).map((c) => (
                                                        <li
                                                            key={c.id}
                                                            className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 text-sm"
                                                        >
                                                            <span className="font-mono font-bold text-primary">
                                                                {c.code}
                                                            </span>
                                                            <span className="text-on-surface-variant">
                                                                {c.discountValue}% off · exp.{' '}
                                                                {new Date(c.expiresAt).toLocaleDateString()}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {user?.address && (
                                            <p className="mt-4 text-sm text-on-surface-variant">
                                                <span className="font-semibold text-on-surface">Address:</span>{' '}
                                                {user.address}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {activeSection === 'rewards' && (
                                    <section id="section-rewards">
                                        <h2 className="mb-8 text-2xl font-semibold text-on-surface">
                                            Điểm tích lũy & Khuyến mãi
                                        </h2>
                                        <ProfileRewardsPanel
                                            loyaltyPoints={pointsBalance ?? stats?.loyaltyPoints ?? undefined}
                                        />
                                    </section>
                                )}

                                {/* Orders */}
                                {activeSection === 'orders' && (
                                    <section id="section-orders">
                                        <div className="mb-8 flex items-center justify-between">
                                            <h2 className="text-2xl font-semibold text-on-surface">Order History</h2>
                                            <Link
                                                to="/profile/orders"
                                                className="text-sm font-medium text-primary hover:underline"
                                            >
                                                View All Orders
                                            </Link>
                                        </div>
                                        {ordersError && (
                                            <p className="mb-4 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                                                {ordersError}
                                            </p>
                                        )}
                                        <div className="flex flex-col gap-4">
                                            {ordersLoading && (
                                                <div className="flex justify-center py-12">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                                                </div>
                                            )}
                                            {!ordersLoading && orders.length === 0 && (
                                                <p className="rounded-[24px] bg-surface-container-low p-8 text-center text-on-surface-variant">
                                                    You have not placed any orders yet.{' '}
                                                    <Link to="/categories" className="text-primary hover:underline">
                                                        Browse products
                                                    </Link>
                                                </p>
                                            )}
                                            {!ordersLoading &&
                                                orders.map((order) => {
                                                const productPath = order.productSlug
                                                    ? `/products/${order.productSlug}`
                                                    : null;
                                                return (
                                                <div
                                                    key={order.orderNumber}
                                                    className="soft-shadow rounded-[24px] border border-transparent bg-surface-container-lowest p-6 transition-all hover:border-primary/20"
                                                >
                                                    <div className="flex flex-col justify-between gap-4 md:flex-row">
                                                        <button
                                                            type="button"
                                                            disabled={!productPath}
                                                            onClick={() =>
                                                                productPath && navigate(productPath)
                                                            }
                                                            className={`flex min-w-0 flex-1 gap-4 text-left ${
                                                                productPath
                                                                    ? 'cursor-pointer hover:opacity-90'
                                                                    : 'cursor-default'
                                                            }`}
                                                        >
                                                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                                                                <img
                                                                    src={order.image}
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="mb-1 flex items-center gap-2">
                                                                    <span
                                                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${order.statusClass}`}
                                                                    >
                                                                        {order.statusLabel}
                                                                    </span>
                                                                    <span className="text-xs text-on-surface-variant">
                                                                        #{order.orderNumber}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-sm font-medium text-on-surface">
                                                                    {order.title}
                                                                </h3>
                                                                <p className="text-sm text-on-surface-variant">
                                                                    {order.detail}
                                                                </p>
                                                                {productPath && (
                                                                    <p className="mt-1 text-xs font-medium text-primary">
                                                                        View product →
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </button>
                                                        <div className="flex items-end justify-between md:flex-col md:items-end">
                                                            <span
                                                                className={`text-2xl font-semibold ${order.priceClass}`}
                                                            >
                                                                {order.price}
                                                            </span>
                                                            {productPath ? (
                                                                <Link
                                                                    to={productPath}
                                                                    className="mt-2 inline-flex items-center justify-center rounded-full border border-outline-variant px-6 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
                                                                >
                                                                    View product
                                                                </Link>
                                                            ) : (
                                                                <Link
                                                                    to={`/profile/orders/${order.orderNumber}`}
                                                                    className={`mt-2 inline-flex items-center justify-center rounded-full px-6 py-2 text-xs font-semibold transition-colors ${order.actionClass}`}
                                                                >
                                                                    {order.action}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {order.progress > 0 && (
                                                        <OrderProgress filled={order.progress} />
                                                    )}
                                                </div>
                                            );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {/* Reviews */}
                                {activeSection === 'reviews' && (
                                    <section id="section-reviews">
                                        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                                            <h2 className="text-2xl font-semibold text-on-surface">My Reviews</h2>
                                            <button
                                                type="button"
                                                onClick={() => setReviewModalOpen(true)}
                                                className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary"
                                            >
                                                Write a Review
                                            </button>
                                        </div>
                                        {reviewsError && (
                                            <p className="mb-4 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                                                {reviewsError}
                                            </p>
                                        )}
                                        {reviewsLoading && (
                                            <div className="flex justify-center py-12">
                                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                                            </div>
                                        )}
                                        {!reviewsLoading && reviews.length === 0 && (
                                            <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center">
                                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <span className="material-symbols-outlined text-[32px]">
                                                        rate_review
                                                    </span>
                                                </div>
                                                <h3 className="mb-2 text-2xl font-semibold text-on-surface">
                                                    No reviews yet
                                                </h3>
                                                <p className="mb-6 text-sm text-on-surface-variant">
                                                    Review items from delivered orders to earn points or coupons for
                                                    your next purchase.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewModalOpen(true)}
                                                    className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-on-primary transition active:scale-95"
                                                >
                                                    Write a Review
                                                </button>
                                            </div>
                                        )}
                                        {!reviewsLoading && reviews.length > 0 && (
                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                {reviews.map((review) => (
                                                    <div
                                                        key={review.id}
                                                        className="soft-shadow rounded-[24px] bg-surface-container-lowest p-8"
                                                    >
                                                        <div className="mb-4 flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((n) => (
                                                                    <span
                                                                        key={n}
                                                                        className={`material-symbols-outlined ${
                                                                            n <= review.rating
                                                                                ? 'material-symbols-filled text-primary'
                                                                                : 'text-outline-variant'
                                                                        }`}
                                                                    >
                                                                        star
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant">
                                                                {review.status}
                                                            </span>
                                                        </div>
                                                        {review.productSlug ? (
                                                            <Link
                                                                to={`/products/${review.productSlug}`}
                                                                className="mb-2 block text-sm font-medium text-on-surface hover:text-primary"
                                                            >
                                                                {review.productName}
                                                            </Link>
                                                        ) : (
                                                            <h3 className="mb-2 text-sm font-medium text-on-surface">
                                                                {review.productName}
                                                            </h3>
                                                        )}
                                                        {review.comment ? (
                                                            <p className="text-base italic text-on-surface-variant">
                                                                &quot;{review.comment}&quot;
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-on-surface-variant">
                                                                No written comment.
                                                            </p>
                                                        )}
                                                        <p className="mt-4 text-xs text-on-surface-variant">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* Settings */}
                                {activeSection === 'settings' && (
                                    <section id="section-settings">
                                        <h2 className="mb-8 text-2xl font-semibold text-on-surface">
                                            Account Settings
                                        </h2>
                                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                            {[
                                                {
                                                    icon: 'lock',
                                                    title: 'Security',
                                                    desc: 'Passwords, 2FA, Devices'
                                                },
                                                {
                                                    icon: 'credit_card',
                                                    title: 'Payments',
                                                    desc: 'Student loans, Cards, Billing'
                                                },
                                                {
                                                    icon: 'notifications',
                                                    title: 'Notifications',
                                                    desc: 'Order alerts, Price drops'
                                                }
                                            ].map((card) => (
                                                <button
                                                    key={card.title}
                                                    type="button"
                                                    className="group cursor-pointer rounded-2xl bg-surface-container-low p-6 text-left transition-colors hover:bg-surface-container-high"
                                                >
                                                    <span className="material-symbols-outlined mb-3 text-primary transition-transform group-hover:scale-110">
                                                        {card.icon}
                                                    </span>
                                                    <h4 className="text-sm font-medium text-on-surface">
                                                        {card.title}
                                                    </h4>
                                                    <p className="mt-1 text-xs text-on-surface-variant">{card.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-error/20 py-4 text-error transition hover:bg-error/10 lg:hidden"
                                        >
                                            <span className="material-symbols-outlined">logout</span>
                                            Sign Out
                                        </button>
                                    </section>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            <ProfileFooter />
            <ProfileEditModal open={editOpen} onClose={() => setEditOpen(false)} />
            <WriteReviewModal
                open={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onSuccess={refreshRewards}
            />
        </div>
    );
};

export default ProfilePage;

