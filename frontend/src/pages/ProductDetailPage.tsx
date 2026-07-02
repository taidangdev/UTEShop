import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../services/axiosConfig';
import { formatPrice } from '../utils/formatPrice';
import { addItemToServerCart } from '../services/cartApi';
import { addToCart, getCart } from '../utils/cartStorage';
import ProductImageGallery from '../components/catalog/ProductImageGallery';
import QuantitySelector from '../components/catalog/QuantitySelector';
import SimilarProducts from '../components/catalog/SimilarProducts';
import WriteReviewModal from '../components/reviews/WriteReviewModal';
import { getAccessToken } from '../services/authSession';
import RecentlyViewed from '../components/catalog/RecentlyViewed';
import { toggleWishlistApi } from '../services/wishlistApi';
import { useAppSelector } from '../store/hooks';
import type { ApiEnvelope, ApiErrorPayload } from '../types/api';
import { useNotification } from '../context/NotificationContext';
import type { CatalogProduct, ProductDetail, ProductDetailResponse } from '../types/catalog';

function initials(name?: string | null, username?: string | null) {
    const base = name || username || '?';
    const parts = base.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return base.charAt(0).toUpperCase();
}

function StarRating({ value, size = 24 }: { value: number; size?: number }) {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        stars.push(
            <span
                key={i}
                className={`material-symbols-outlined ${filled || half ? 'material-symbols-filled text-primary' : 'text-outline-variant'}`}
                style={{ fontSize: size }}
            >
                {half ? 'star_half' : 'star'}
            </span>
        );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
}

function buildSpecRows(product: ProductDetail): [string, string][] {
    const attrs = (product?.attributes ?? {}) as Record<string, unknown>;
    const rows: [string, string][] = [];

    const str = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));

    if (attrs.microcontroller) rows.push(['Vi điều khiển', str(attrs.microcontroller)]);
    if (attrs.compatibility) rows.push(['Tương thích', str(attrs.compatibility)]);
    if (attrs.components) rows.push(['Thành phần', str(attrs.components)]);
    if (attrs.voltage) rows.push(['Điện áp hoạt động', str(attrs.voltage)]);
    if (attrs.sizes) rows.push(['Kích thước', str(attrs.sizes)]);
    if (attrs.colors) rows.push(['Màu sắc', str(attrs.colors)]);

    if (rows.length === 0) {
        rows.push(['Mã sản phẩm (SKU)', product.sku || '—']);
        rows.push(['Tình trạng', product.condition?.replace('_', ' ') || 'Mới']);
        rows.push(['Loại sản phẩm', product.productType === 'consignment' ? 'Ký gửi' : 'Tiêu chuẩn']);
        if (product.stockQuantity != null) {
            rows.push(['Kho', `${product.stockQuantity} sản phẩm có sẵn`]);
        }
        if ((product.soldCount ?? 0) > 0) {
            rows.push(['Đã bán', String(product.soldCount)]);
        }
    }

    return rows;
}

function ProductDetailFooter() {
    return (
        <footer className="mt-20 w-full bg-surface-container-low py-20">
            <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-6 md:grid-cols-4 lg:px-8">
                <div className="col-span-2">
                    <div className="mb-4 text-2xl font-bold text-on-surface">UTEShop</div>
                    <p className="mb-6 max-w-xs text-base text-on-surface-variant">
                        Cung cấp cho sinh viên kỹ thuật các công cụ cần thiết để đạt thành tích xuất sắc và đổi mới trong học tập.
                    </p>
                    <p className="font-semibold text-on-surface">© 2024 UTEShop. Chất lượng chuẩn kỹ thuật.</p>
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-on-surface">Cửa hàng</h4>
                    <nav className="flex flex-col gap-2">
                        <Link to="/categories?category=study-tools" className="text-xs text-on-surface-variant hover:text-primary">
                            Công cụ học tập
                        </Link>
                        <Link to="/categories?category=technology" className="text-xs text-on-surface-variant hover:text-primary">
                            Công nghệ & Điện tử
                        </Link>
                        <Link to="/categories" className="text-xs text-on-surface-variant hover:text-primary">
                            Tất cả sản phẩm
                        </Link>
                    </nav>
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-on-surface">Hỗ trợ</h4>
                    <nav className="flex flex-col gap-2">
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Hỗ trợ sinh viên
                        </a>
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Giao hàng
                        </a>
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Liên hệ
                        </a>
                    </nav>
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-on-surface">Pháp lý</h4>
                    <nav className="flex flex-col gap-2">
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Chính sách bảo mật
                        </a>
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Điều khoản dịch vụ
                        </a>
                    </nav>
                </div>
            </div>
        </footer>
    );
}

export default function ProductDetailPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { toast } = useNotification();
    const authUser = useAppSelector((s) => s.auth.user);
    const isAuthenticated = Boolean(authUser || getAccessToken());
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [similarProducts, setSimilarProducts] = useState<CatalogProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [cartMessage, setCartMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('specs');
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isWishlistToggling, setIsWishlistToggling] = useState(false);

    useEffect(() => {
        if (product) {
            setIsWishlisted(product.isWishlisted ?? false);

            try {
                const raw = localStorage.getItem('uteshop_recently_viewed');
                let viewed: CatalogProduct[] = [];
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        viewed = parsed;
                    }
                }
                viewed = viewed.filter((p) => p.id !== product.id);
                viewed.unshift(product);
                viewed = viewed.slice(0, 10);
                localStorage.setItem('uteshop_recently_viewed', JSON.stringify(viewed));
            } catch {
                // Ignore
            }
        }
    }, [product]);

    const handleWishlistToggle = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/products/${slug}` } });
            return;
        }
        if (!product || isWishlistToggling) return;

        setIsWishlistToggling(true);
        const nextState = !isWishlisted;
        setIsWishlisted(nextState);

        try {
            const res = await toggleWishlistApi(product.id);
            setIsWishlisted(res.isWishlisted);
        } catch {
            setIsWishlisted(!nextState);
        } finally {
            setIsWishlistToggling(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await axiosInstance.get<ApiEnvelope<ProductDetailResponse>>(
                    `/catalog/products/${slug}`
                );
                if (!cancelled) {
                    const data = res.data;
                    setProduct(data?.product ?? null);
                    setSimilarProducts(data?.similarProducts ?? []);
                    setQuantity(1);
                    setCartMessage(null);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        typeof err === 'string'
                            ? err
                            : (err as { message?: string })?.message || 'Product not found';
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (slug) load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const images = useMemo(() => {
        if (!product?.images?.length) {
            return product?.imageUrl
                ? [{ url: product.imageUrl, altText: product.name }]
                : [{ url: '/PremiumLaptop.png', altText: product?.name || 'Product' }];
        }
        return product.images;
    }, [product]);

    const specRows = useMemo(() => (product ? buildSpecRows(product) : []), [product]);

    const reviews = useMemo(() => product?.reviews ?? [], [product]);

    const reviewAverage = product?.reviewSummary?.average ?? 0;
    const reviewCount = product?.reviewSummary?.count ?? 0;

    const reloadProduct = async () => {
        if (!slug) return;
        try {
            const res = await axiosInstance.get<ApiEnvelope<ProductDetailResponse>>(
                `/catalog/products/${slug}`
            );
            setProduct(res.data?.product ?? null);
        } catch {
            // keep current product on refresh failure
        }
    };

    const handleWriteReview = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/products/${slug}` } });
            return;
        }
        setReviewModalOpen(true);
    };

    const stockQty = product?.stockQuantity ?? 0;
    const soldCount = product?.soldCount ?? 0;
    const lowStockThreshold = product?.lowStockThreshold ?? 5;
    const inStock = stockQty > 0;
    const isLowStock = inStock && stockQty <= lowStockThreshold;
    const maxQuantity = inStock ? stockQty : 0;

    useEffect(() => {
        if (maxQuantity > 0 && quantity > maxQuantity) {
            setQuantity(maxQuantity);
        }
    }, [maxQuantity, quantity]);

    const parentSlug = product?.category?.parent?.slug;
    const categorySlug = product?.category?.slug;
    const categoryName = product?.category?.name;
    const parentName = product?.category?.parent?.name;

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="mx-auto max-w-[1280px] px-6 py-20 text-center lg:px-8">
                <p className="text-error">{error || 'Product not found'}</p>
                <Link to="/categories" className="mt-4 inline-block text-primary hover:underline">
                    Quay lại danh mục
                </Link>
            </div>
        );
    }

    const handleAddToCart = async () => {
        if (!inStock) {
            toast.error('Sản phẩm này đã hết hàng!');
            return;
        }
        try {
            await addItemToServerCart({ productId: product.id, quantity });
            setCartMessage(`Added ${quantity} × ${product.name} to cart`);
            window.setTimeout(() => setCartMessage(null), 3500);
            await reloadProduct();
        } catch (err: any) {
            const apiError = err as ApiErrorPayload;
            if (apiError && (apiError.status === 'error' || apiError.message)) {
                toast.error(apiError.message || 'Không thể thêm sản phẩm vào giỏ hàng');
                await reloadProduct();
                return;
            }

            // Fallback for network error (local cart)
            const localCart = getCart();
            const existing = localCart.find((i) => i.productId === product.id);
            const currentQty = existing ? existing.quantity : 0;
            const max = product.stockQuantity ?? 999;
            
            if (currentQty + quantity > max) {
                toast.error(`Bạn đã có ${currentQty} sản phẩm trong giỏ hàng. Chỉ có thể thêm tối đa ${max - currentQty} sản phẩm.`);
                return;
            }

            addToCart({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl ?? images[0]?.url ?? null,
                quantity,
                stockQuantity: product.stockQuantity
            });
            setCartMessage(`Added ${quantity} × ${product.name} to cart`);
            window.setTimeout(() => setCartMessage(null), 3500);
        }
    };

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-8 lg:px-8">
                {/* Breadcrumbs */}
                <nav className="mb-10 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                    <Link to="/categories" className="hover:text-primary">
                        Categories
                    </Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    {parentSlug ? (
                        <>
                            <Link
                                to={`/categories?category=${parentSlug}`}
                                className="hover:text-primary"
                            >
                                {parentName || 'Category'}
                            </Link>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </>
                    ) : categorySlug ? (
                        <>
                            <Link
                                to={`/categories?category=${categorySlug}`}
                                className="hover:text-primary"
                            >
                                {categoryName}
                            </Link>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </>
                    ) : null}
                    <span className="font-semibold text-primary">{product.name}</span>
                </nav>

                {/* Hero */}
                <section className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                        <ProductImageGallery images={images} productName={product.name} />
                    </div>
                    <div className="lg:col-span-5 lg:sticky lg:top-28">
                        {product.isFeatured && (
                            <span className="mb-4 inline-flex items-center rounded-full bg-surface-container-highest px-3 py-1 text-xs font-semibold text-on-surface-variant">
                                PHÁT HÀNH MỚI
                            </span>
                        )}
                        <h1 className="mb-2 text-4xl font-bold leading-tight tracking-tight text-on-surface md:text-5xl">
                            {product.name}
                        </h1>
                        <p className="mb-6 text-lg text-on-surface-variant">
                            {product.shortDescription || product.description}
                        </p>

                        <div className="mb-8 flex flex-wrap items-center gap-4">
                            <span className="text-4xl font-bold text-primary">
                                {formatPrice(product.price)}
                            </span>
                            {product.compareAtPrice != null &&
                                product.compareAtPrice > product.price && (
                                    <>
                                        <span className="text-base text-on-surface-variant line-through">
                                            {formatPrice(product.compareAtPrice)}
                                        </span>
                                        {product.discountPercent != null && (
                                            <span className="rounded bg-tertiary-fixed px-2 py-1 text-xs font-semibold text-on-tertiary-fixed-variant">
                                                Giảm {product.discountPercent}%
                                            </span>
                                        )}
                                    </>
                                )}
                        </div>

                        <div className="mb-6 flex flex-wrap gap-4 text-sm">
                            {soldCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1.5 font-medium text-on-surface">
                                    <span className="material-symbols-outlined text-[18px] text-primary">
                                        trending_up
                                    </span>
                                    {soldCount.toLocaleString()} đã bán
                                </span>
                            )}
                            {product.buyersCount != null && product.buyersCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1.5 font-medium text-on-surface">
                                    <span className="material-symbols-outlined text-[18px] text-primary">
                                        shopping_bag
                                    </span>
                                    {product.buyersCount.toLocaleString()} đã mua
                                </span>
                            )}
                            {product.commentersCount != null && product.commentersCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1.5 font-medium text-on-surface">
                                    <span className="material-symbols-outlined text-[18px] text-primary">
                                        comment
                                    </span>
                                    {product.commentersCount.toLocaleString()} bình luận
                                </span>
                            )}
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium ${
                                    inStock
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-error/10 text-error'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {inStock ? 'inventory_2' : 'block'}
                                </span>
                                {inStock
                                    ? isLowStock
                                        ? `Chỉ còn ${stockQty} sản phẩm`
                                        : `Còn ${stockQty} sản phẩm`
                                    : 'Hết hàng'}
                            </span>
                            {categoryName && (
                                <Link
                                    to={`/categories?category=${categorySlug || parentSlug || ''}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-outline-variant/40 px-3 py-1.5 font-medium text-on-surface-variant hover:text-primary"
                                >
                                    <span className="material-symbols-outlined text-[18px]">category</span>
                                    {parentName ? `${parentName} · ${categoryName}` : categoryName}
                                </Link>
                            )}
                        </div>

                        <div className="mb-6">
                            <QuantitySelector
                                value={quantity}
                                max={maxQuantity}
                                disabled={!inStock}
                                onChange={setQuantity}
                            />
                        </div>

                        {cartMessage && (
                            <div
                                className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface"
                                role="status"
                            >
                                {cartMessage}
                            </div>
                        )}

                        <div className="mb-10 flex gap-4">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={!inStock}
                                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[24px] bg-primary text-sm font-bold text-on-primary transition hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="material-symbols-outlined">shopping_cart</span>
                                {inStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                            </button>
                            <button
                                type="button"
                                onClick={handleWishlistToggle}
                                disabled={isWishlistToggling}
                                className="flex h-14 w-14 items-center justify-center rounded-[24px] border border-outline-variant bg-surface-container-low transition hover:bg-surface-container-high active:scale-95 shrink-0"
                                aria-label={isWishlisted ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
                            >
                                <span
                                    className={`material-symbols-outlined text-[24px] transition-all ${
                                        isWishlisted ? 'material-symbols-filled text-red-500 scale-110' : 'text-on-surface-variant'
                                    }`}
                                >
                                    favorite
                                </span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-surface-container-low p-4">
                                <div className="mb-1 text-xs text-on-surface-variant">TƯƠNG THÍCH</div>
                                <div className="font-bold">
                                    {String(product.attributes?.compatibility ?? 'Arduino / ESP32')}
                                </div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                                <div className="mb-1 text-xs text-on-surface-variant">THÀNH PHẦN</div>
                                <div className="font-bold">
                                    {String(product.attributes?.components ?? '140+ Pieces')}
                                </div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                                <div className="mb-1 text-xs text-on-surface-variant">TÌNH TRẠNG</div>
                                <div className={`flex items-center gap-1 font-bold ${inStock ? 'text-primary' : 'text-error'}`}>
                                    <span
                                        className={`h-2 w-2 rounded-full ${inStock ? 'bg-primary' : 'bg-error'}`}
                                    />
                                    {inStock ? 'Còn hàng' : 'Hết hàng'}
                                </div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                                <div className="mb-1 text-xs text-on-surface-variant">GIAO HÀNG</div>
                                <div className="font-bold">
                                    {inStock ? 'Nhận hàng trong ngày' : 'Thông báo khi có sẵn'}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tabs */}
                <section className="mt-20">
                    <div className="mb-12 border-b border-outline-variant">
                        <div className="flex gap-8 overflow-x-auto">
                            {[
                                { id: 'specs', label: 'Thông số kỹ thuật' },
                                { id: 'box', label: 'Bên trong hộp' },
                                { id: 'majors', label: 'Phù hợp khóa học' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`shrink-0 pb-4 text-sm font-medium transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-b-2 border-primary font-bold text-on-surface'
                                            : 'text-on-surface-variant hover:text-primary'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
                        {activeTab === 'specs' && (
                            <div className="space-y-12">
                                <h3 className="text-3xl font-semibold text-on-surface">Chi tiết thông số</h3>
                                <div className="space-y-6">
                                    {specRows.map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="flex items-center justify-between border-b border-surface-container-highest pb-4"
                                        >
                                            <span className="text-on-surface-variant">{label}</span>
                                            <span className="text-right font-semibold text-on-surface">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'box' && (
                            <div className="space-y-6">
                                <h3 className="text-3xl font-semibold text-on-surface">Bên trong hộp</h3>
                                <p className="text-base leading-relaxed text-on-surface-variant whitespace-pre-line">
                                    {product.description ||
                                        'Bộ sản phẩm hoàn chỉnh với đầy đủ các thành phần cần thiết cho các bài thực hành kỹ thuật cơ sở.'}
                                </p>
                                {(product.tags?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {(product.tags ?? []).map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full border border-outline-variant bg-white px-4 py-2 text-sm text-on-surface-variant"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'majors' && (
                            <div className="soft-shadow rounded-[24px] bg-surface-container-low p-8 md:col-span-2">
                                <h3 className="mb-6 text-3xl font-semibold text-on-surface">
                                    Tương thích chuyên ngành
                                </h3>
                                <p className="mb-8 text-base text-on-surface-variant">
                                    Sản phẩm này được khuyên dùng cho sinh viên trong các chương trình sau:
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {(product.majors?.length ?? 0) > 0 ? (
                                        (product.majors ?? []).map((m) => (
                                            <span
                                                key={m.id}
                                                className="rounded-full border border-outline-variant bg-white px-4 py-2 text-sm text-on-surface-variant"
                                            >
                                                {m.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-on-surface-variant">
                                            Phù hợp với tất cả các ngành kỹ thuật.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="soft-shadow rounded-[24px] bg-surface-container-low p-8">
                                <h3 className="mb-6 text-3xl font-semibold text-on-surface">
                                    Tương thích chuyên ngành
                                </h3>
                                <p className="mb-8 text-base text-on-surface-variant">
                                    Được xác minh và khuyên dùng cho các học phần liên quan đến:
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {(product.majors || []).map((m) => (
                                        <span
                                            key={m.id}
                                            className="rounded-full border border-outline-variant bg-white px-4 py-2 text-sm text-on-surface-variant"
                                        >
                                            {m.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <SimilarProducts products={similarProducts} categoryName={categoryName} />

                <RecentlyViewed />

                {/* Reviews */}
                <section className="mt-20">
                    <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="mb-2 text-4xl font-bold text-on-surface">Đánh giá của sinh viên</h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <StarRating value={reviewAverage} />
                                {reviewCount > 0 && (
                                    <>
                                        <span className="font-bold text-on-surface">
                                            {reviewAverage.toFixed(1)} / 5.0
                                        </span>
                                        <span className="text-on-surface-variant">
                                            Dựa trên {reviewCount} sinh viên
                                        </span>
                                    </>
                                )}
                                {reviewCount === 0 && (
                                    <span className="text-on-surface-variant">Chưa có đánh giá nào</span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleWriteReview}
                            className="rounded-full bg-surface-container-highest px-6 py-3 text-sm font-bold text-on-surface transition hover:bg-surface-container-high"
                        >
                            Viết đánh giá
                        </button>
                    </div>

                    {reviews.length === 0 && (
                        <p className="mb-8 rounded-[24px] bg-surface-container-low px-6 py-10 text-center text-on-surface-variant">
                            Hãy là người đầu tiên đánh giá sản phẩm này sau khi đơn hàng của bạn được xác nhận.
                        </p>
                    )}

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        {reviews.slice(0, 6).map((review) => (
                            <div
                                key={review.id}
                                className="soft-shadow flex h-full flex-col rounded-[24px] bg-white p-8"
                            >
                                <StarRating value={review.rating} size={18} />
                                <p className="mb-3 mt-4 font-bold text-on-surface">
                                    {review.title || 'Đánh giá của sinh viên'}
                                </p>
                                <p className="flex-grow text-base text-on-surface-variant">
                                    {review.comment ? `"${review.comment}"` : 'Không có bình luận.'}
                                </p>
                                <div className="mt-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-bold text-primary">
                                        {initials(
                                            review.user?.fullName,
                                            review.user?.username
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-on-surface">
                                            {review.user?.fullName || review.user?.username}
                                        </div>
                                        <div className="text-xs text-on-surface-variant">Sinh viên đã xác thực</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <ProductDetailFooter />

            {product && (
                <WriteReviewModal
                    open={reviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    productId={product.id}
                    onSuccess={reloadProduct}
                />
            )}
        </div>
    );
}
