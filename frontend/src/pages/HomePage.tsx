import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    FiBook,
    FiMonitor,
    FiPackage,

    FiArrowRight,
    FiAward,
    FiHome,
    FiRefreshCw
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import axiosInstance from '../services/axiosConfig';
import { useAppSelector } from '../store/hooks';

import type { ApiEnvelope } from '../types/api';
import type { CatalogProduct, CategoryWithCount, HomePageData, PromoBanner } from '../types/catalog';
import ShopFooter from '../components/layout/ShopFooter';
import ProductCard from '../components/catalog/ProductCard';

const PRIMARY = '#004AC6';
const TEXT = '#191B23';
const TEXT_BODY = '#434655';
const SURFACE = '#F3F3FE';
const PAGE_BG = '#FAF8FF';

const CATEGORY_META: Record<string, { label: string; Icon: IconType }> = {
    merchandise: { label: 'Đồ lưu niệm trường', Icon: FiAward },
    'study-tools': { label: 'Công cụ học tập', Icon: FiBook },
    technology: { label: 'Công nghệ & Điện tử', Icon: FiMonitor },
    'student-life': { label: 'Đời sống sinh viên', Icon: FiHome },
    'second-hand': { label: 'Đồ cũ / Sách cũ', Icon: FiRefreshCw }
};

const FALLBACK_PROMOS: PromoBanner[] = [
    {
        id: 0,
        title: 'Mừng tựu trường: Giảm giá 20% các sản phẩm lưu niệm.',
        subtitle: 'Khuyến mãi mùa tựu trường',
        badgeText: 'Ưu đãi lớn',
        linkUrl: '/categories?category=merchandise',
        placement: 'promo_left'
    },
    {
        id: -1,
        title: 'Bộ dụng cụ tân sinh viên: Đầy đủ dụng cụ thực hành Thiết kế Mạch 101.',
        subtitle: 'Sản phẩm mới',
        badgeText: 'Mới về',
        linkUrl: '/categories?sort=newest',
        placement: 'promo_right'
    }
];



function InternalLink({
    to,
    className,
    style,
    children
}: {
    to: string;
    className?: string;
    style?: React.CSSProperties;
    children: ReactNode;
}) {
    if (to.startsWith('http://') || to.startsWith('https://')) {
        return (
            <a href={to} className={className} style={style} target="_blank" rel="noreferrer">
                {children}
            </a>
        );
    }
    if (to.startsWith('/#')) {
        return (
            <a href={to} className={className} style={style}>
                {children}
            </a>
        );
    }
    if (to.startsWith('/')) {
        return (
            <Link to={to} className={className} style={style}>
                {children}
            </Link>
        );
    }
    return (
        <a href={to} className={className} style={style}>
            {children}
        </a>
    );
}

function MemberWelcomeBanner({ name }: { name: string }) {
    return (
        <section className="w-full px-6 pt-6 lg:px-8">
            <div className="mx-auto max-w-[1280px] rounded-2xl border border-primary/15 bg-primary/5 px-6 py-4 md:flex md:items-center md:justify-between md:gap-6">
                <div>
                    <p className="font-inter text-sm font-semibold text-primary">Cổng thành viên</p>
                    <p className="mt-1 font-inter text-lg font-semibold" style={{ color: TEXT }}>
                        Chào mừng quay trở lại, {name}
                    </p>
                    <p className="mt-1 font-inter text-sm" style={{ color: TEXT_BODY }}>
                        Khám phá khuyến mãi, sản phẩm mới nhất và các mặt hàng bán chạy dành riêng cho sinh viên UTE.
                    </p>
                </div>
                <Link
                    to="/profile"
                    className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-full px-6 font-inter text-sm font-semibold text-white md:mt-0"
                    style={{ backgroundColor: PRIMARY }}
                >
                    Tài khoản của tôi
                </Link>
            </div>
        </section>
    );
}

function HeroSection({ isMember }: { isMember: boolean }) {
    return (
        <section className="relative w-full overflow-hidden bg-white">
            <div
                className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/3 lg:block"
                style={{
                    background: `linear-gradient(270deg, rgba(0, 74, 198, 0.05) 0%, rgba(0, 74, 198, 0) 100%)`
                }}
                aria-hidden
            />
            <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-24 xl:py-32">
                <div className="flex flex-col">
                    {isMember && (
                        <span
                            className="mb-4 inline-flex w-fit rounded-full px-4 py-1 font-inter text-xs font-semibold"
                            style={{ backgroundColor: 'rgba(0, 74, 198, 0.1)', color: PRIMARY }}
                        >
                            Đã đăng nhập · Lựa chọn & Ưu đãi thành viên
                        </span>
                    )}
                    <h1
                        className="font-inter text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-[56px] lg:leading-[1.1]"
                        style={{ color: TEXT }}
                    >
                        Kiến tạo Chất lượng. Thiết kế cho Sinh viên.
                    </h1>
                    <p className="mt-6 max-w-[549px] font-inter text-lg leading-[29px]" style={{ color: TEXT_BODY }}>
                        Hệ sinh thái toàn diện cho sinh viên UTE. Từ thiết bị thực hành kỹ thuật chuyên dụng đến các đồ dùng học tập thiết yếu.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <a
                            href="#newest"
                            className="inline-flex h-14 items-center justify-center rounded-full px-8 font-inter text-base font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition hover:opacity-90"
                            style={{ backgroundColor: PRIMARY }}
                        >
                            Mua sắm ngay
                        </a>
                        <Link
                            to="/categories"
                            className="inline-flex h-14 items-center justify-center rounded-full px-8 font-inter text-base font-medium shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition hover:bg-gray-200"
                            style={{ backgroundColor: '#F5F5F7', color: TEXT }}
                        >
                            Danh mục sản phẩm
                        </Link>
                    </div>
                </div>
                <div className="relative">
                    <div
                        className="absolute -left-2 -top-4 h-full w-full rounded-3xl opacity-50 blur-3xl"
                        style={{ backgroundColor: 'rgba(0, 74, 198, 0.05)' }}
                        aria-hidden
                    />
                    <img
                        src="/PremiumLaptop.png"
                        alt="Study space"
                        className="relative w-full rounded-3xl object-cover shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
                        style={{ aspectRatio: '592/600', maxHeight: 600 }}
                    />
                </div>
            </div>
        </section>
    );
}

function CategorySection({ categories }: { categories: CategoryWithCount[] }) {
    const items = categories.length
        ? categories
        : Object.entries(CATEGORY_META).map(([slug, meta]) => ({
              slug,
              name: meta.label,
              productCount: 0
          }));

    return (
        <section id="categories" className="scroll-mt-24 w-full px-6 py-20 lg:px-8">
            <div className="mx-auto max-w-[1280px]">
                <h2 className="font-inter text-2xl font-semibold" style={{ color: TEXT }}>
                    Mua sắm theo Danh mục
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
                    {items.map((cat) => {
                        const meta = CATEGORY_META[cat.slug] || {
                            label: cat.name,
                            Icon: FiPackage
                        };
                        const { label, Icon } = meta;
                        return (
                            <Link
                                key={cat.slug}
                                to={`/categories?category=${cat.slug}`}
                                className="flex flex-col items-center gap-4 rounded-3xl border border-white/30 bg-white/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-[20px] transition hover:bg-white/90"
                            >
                                <div
                                    className="flex h-16 w-16 items-center justify-center rounded-full"
                                    style={{ backgroundColor: '#EDE9FA' }}
                                >
                                    <Icon className="h-9 w-9" style={{ color: PRIMARY }} strokeWidth={1.5} />
                                </div>
                                <span
                                    className="text-center font-inter text-sm leading-5"
                                    style={{ color: TEXT_BODY }}
                                >
                                    {label}
                                </span>
                                {cat.productCount > 0 && (
                                    <span className="text-center font-inter text-xs text-primary">
                                        {cat.productCount} sản phẩm
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Reusable ProductCard is now imported from components/catalog/ProductCard



function ProductCarouselSection({
    id,
    title,
    products,
    viewAllTo,
    background
}: {
    id: string;
    title: string;
    products: CatalogProduct[];
    viewAllTo: string;
    background?: string;
}) {
    if (products.length === 0) return null;

    return (
        <section
            id={id}
            className="scroll-mt-24 w-full px-6 py-20 lg:px-8"
            style={background ? { backgroundColor: background } : undefined}
        >
            <div className="mx-auto max-w-[1280px]">
                <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-inter text-3xl font-semibold" style={{ color: TEXT }}>
                        {title}
                    </h2>
                    <Link
                        to={viewAllTo}
                        className="font-inter text-sm font-medium transition hover:underline"
                        style={{ color: PRIMARY }}
                    >
                        Xem tất cả
                    </Link>
                </div>
                <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={32}
                    slidesPerView={1.2}
                    navigation
                    pagination={{ clickable: true }}
                    breakpoints={{
                        640: { slidesPerView: 2.2 },
                        1024: { slidesPerView: 4 }
                    }}
                    className="!pb-14"
                >
                    {products.map((p) => (
                        <SwiperSlide key={p.id} className="h-auto">
                            <ProductCard product={p} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
}

function PromoBanners({ banners }: { banners: PromoBanner[] }) {
    const left =
        banners.find((b) => b.placement === 'promo_left') ||
        FALLBACK_PROMOS.find((b) => b.placement === 'promo_left');
    const right =
        banners.find((b) => b.placement === 'promo_right') ||
        FALLBACK_PROMOS.find((b) => b.placement === 'promo_right');

    if (!left && !right) return null;

    return (
        <section id="promo" className="scroll-mt-24 w-full px-6 py-20 lg:px-8">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 lg:grid-cols-2">
                {left && (
                    <div
                        className="relative overflow-hidden rounded-3xl p-12"
                        style={{
                            background: left.imageUrl
                                ? `linear-gradient(135deg, rgba(0,74,198,0.92) 0%, rgba(37,99,235,0.88) 100%), url(${left.imageUrl}) center/cover`
                                : `linear-gradient(135deg, ${PRIMARY} 0%, #2563EB 100%)`,
                            minHeight: 320
                        }}
                    >
                        <span className="inline-flex rounded-full bg-white/20 px-4 py-1 font-inter text-sm text-white backdrop-blur-md">
                            {left.badgeText || left.subtitle || 'Khuyến mãi'}
                        </span>
                        <h2 className="mt-6 max-w-md font-inter text-3xl font-semibold leading-tight text-white">
                            {left.title}
                        </h2>
                        <InternalLink
                            to={left.linkUrl || '/categories'}
                            className="mt-6 inline-flex items-center gap-2 font-inter text-sm font-medium text-white transition hover:opacity-90"
                        >
                            Mua ngay bộ sưu tập
                            <FiArrowRight className="h-5 w-5" />
                        </InternalLink>
                    </div>
                )}
                {right && (
                    <div
                        className="relative overflow-hidden rounded-3xl p-12"
                        style={{
                            backgroundColor: right.imageUrl ? undefined : '#F5F5F7',
                            backgroundImage: right.imageUrl ? `url(${right.imageUrl})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            minHeight: 320
                        }}
                    >
                        {right.imageUrl && (
                            <div className="absolute inset-0 bg-white/85" aria-hidden />
                        )}
                        <div className="relative">
                            <span
                                className="inline-flex rounded-full px-4 py-1 font-inter text-sm font-medium"
                                style={{ backgroundColor: 'rgba(0, 74, 198, 0.1)', color: PRIMARY }}
                            >
                                {right.badgeText || right.subtitle || 'Mới'}
                            </span>
                            <h2
                                className="mt-6 max-w-md font-inter text-3xl font-semibold leading-tight"
                                style={{ color: TEXT }}
                            >
                                {right.title}
                            </h2>
                            <InternalLink
                                to={right.linkUrl || '/categories?sort=newest'}
                                className="mt-6 inline-flex items-center gap-2 font-inter text-sm font-medium transition hover:opacity-80"
                                style={{ color: PRIMARY }}
                            >
                                Tự build trọn bộ
                                <FiArrowRight className="h-5 w-5" />
                            </InternalLink>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}



export default function HomePage() {
    const user = useAppSelector((state) => state.auth.user);
    const [data, setData] = useState<HomePageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await axiosInstance.get<ApiEnvelope<HomePageData>>('/catalog/home');
                if (!cancelled) {
                    setData(res.data);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        typeof err === 'string'
                            ? err
                            : (err as { message?: string })?.message || 'Không thể tải dữ liệu trang chủ';
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const memberName = user?.fullName || user?.username || user?.email || 'Sinh viên';

    const bestSellers = data?.bestSellers ?? [];
    const mostViewed = data?.mostViewed ?? [];
    const categories = data?.categories ?? [];
    const banners = data?.banners ?? [];

    return (
        <div style={{ backgroundColor: PAGE_BG, color: TEXT }}>
            {user && <MemberWelcomeBanner name={memberName} />}
            <main>
                <HeroSection isMember={Boolean(user)} />
                {loading && (
                    <div className="flex justify-center py-16">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    </div>
                )}
                {error && !loading && (
                    <p className="py-8 text-center font-inter text-sm text-red-600">{error}</p>
                )}
                {!loading && (
                    <>
                        <CategorySection categories={categories} />
                        <PromoBanners banners={banners} />
                        <ProductCarouselSection
                            id="bestsellers"
                            title="Bán chạy nhất"
                            products={bestSellers}
                            viewAllTo="/categories?sort=popular"
                            background={SURFACE}
                        />
                        <ProductCarouselSection
                            id="mostviewed"
                            title="Xem nhiều nhất"
                            products={mostViewed}
                            viewAllTo="/categories?sort=popular"
                        />
                    </>
                )}
            </main>
            <ShopFooter />
        </div>
    );
}
