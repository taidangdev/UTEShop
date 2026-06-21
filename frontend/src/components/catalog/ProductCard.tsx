import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { formatPrice } from '../../utils/formatPrice';
import { toggleWishlistApi } from '../../services/wishlistApi';
import { getAccessToken } from '../../services/authSession';
import { useAppSelector } from '../../store/hooks';
import type { CatalogProduct } from '../../types/catalog';
import { addToCart } from '../../utils/cartStorage';
import { addItemToServerCart } from '../../services/cartApi';
import { useNotification } from '../../context/NotificationContext';

interface ProductCardProps {
    product: CatalogProduct;
    onWishlistToggle?: (productId: number, isWishlisted: boolean) => void;
}

const PRIMARY = '#004AC6';
const TEXT = '#191B23';
const TEXT_BODY = '#434655';

function categoryLabel(product: CatalogProduct) {
    const c = product.category;
    if (!c) return 'General';
    if (c.parentName) return `${c.parentName} · ${c.name}`;
    return c.name;
}

export default function ProductCard({ product, onWishlistToggle }: ProductCardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const authUser = useAppSelector((s) => s.auth.user);
    const isAuthenticated = Boolean(authUser || getAccessToken());
    const [isWishlisted, setIsWishlisted] = useState(product.isWishlisted ?? false);
    const [isToggling, setIsToggling] = useState(false);

    const { toast } = useNotification();

    useEffect(() => {
        setIsWishlisted(product.isWishlisted ?? false);
    }, [product.isWishlisted]);

    const handleWishlistClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate('/login', { state: { from: location.pathname + location.search } });
            return;
        }

        if (isToggling) return;

        setIsToggling(true);
        const nextState = !isWishlisted;
        setIsWishlisted(nextState);

        try {
            const res = await toggleWishlistApi(product.id);
            setIsWishlisted(res.isWishlisted);
            if (onWishlistToggle) {
                onWishlistToggle(product.id, res.isWishlisted);
            }
        } catch {
            setIsWishlisted(!nextState);
        } finally {
            setIsToggling(false);
        }
    };

    const handleCartClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await addItemToServerCart({ productId: product.id, quantity: 1 });
        } catch {
            addToCart({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl || null,
                categoryId: product.category?.id,
                quantity: 1
            });
        }

        toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    };

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1">
            <div className="h-80 overflow-hidden relative" style={{ backgroundColor: '#EDE9FA' }}>
                <Link to={`/products/${product.slug}`} className="block h-full w-full">
                    <img
                        src={product.imageUrl || '/PremiumLaptop.png'}
                        alt={product.imageAlt || product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
                <button
                    type="button"
                    onClick={handleWishlistClick}
                    disabled={isToggling}
                    className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm transition-all hover:scale-110 active:scale-95 active:bg-white hover:bg-white"
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                    {isWishlisted ? (
                        <FaHeart className="h-5 w-5 text-red-500 scale-110 transition-transform duration-200" />
                    ) : (
                        <FiHeart className="h-5 w-5 text-gray-600 transition-colors duration-200 hover:text-red-500" />
                    )}
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-6">
                <Link to={`/products/${product.slug}`} className="block group/title">
                    <span
                        className="font-inter text-xs font-medium uppercase tracking-wide"
                        style={{ color: PRIMARY }}
                    >
                        {categoryLabel(product)}
                    </span>
                    <h3 className="font-inter text-lg font-semibold leading-7 line-clamp-2 mt-1 group-hover/title:text-primary transition-colors" style={{ color: TEXT }}>
                        {product.name}
                    </h3>
                </Link>
                
                <div className="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
                    {product.buyersCount != null && product.buyersCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2.5 py-1 font-medium text-slate-700">
                            <span className="material-symbols-outlined text-[15px] text-primary">shopping_bag</span>
                            {product.buyersCount} đã mua
                        </span>
                    )}
                    {product.commentersCount != null && product.commentersCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2.5 py-1 font-medium text-slate-700">
                            <span className="material-symbols-outlined text-[15px] text-primary">comment</span>
                            {product.commentersCount} đánh giá
                        </span>
                    )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-2">
                    <Link to={`/products/${product.slug}`} className="flex items-baseline gap-2 group/price">
                        <p className="font-inter text-2xl font-bold group-hover/price:text-primary transition-colors" style={{ color: TEXT }}>
                            {formatPrice(product.price)}
                        </p>
                        {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                            <span className="text-xs text-on-surface-variant line-through">
                                {formatPrice(product.compareAtPrice)}
                            </span>
                        )}
                    </Link>
                    <button
                        type="button"
                        onClick={handleCartClick}
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 z-10"
                        style={{ backgroundColor: PRIMARY }}
                        aria-label="Thêm vào giỏ hàng"
                    >
                        <FiShoppingCart className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>
                {(product.soldCount ?? 0) > 0 && (
                    <p className="font-inter text-xs" style={{ color: TEXT_BODY }}>
                        {product.soldCount} đã bán
                    </p>
                )}
            </div>
        </article>
    );
}
