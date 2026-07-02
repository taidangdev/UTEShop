import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../services/axiosConfig';
import {
    apiItemsToCartLines,
    cartItemCount,
    fetchServerCart,
    mergeLocalCartToServer,
    removeServerCartItem,
    updateServerCartItem
} from '../services/cartApi';
import ShopFooter from '../components/layout/ShopFooter';
import { useAppSelector } from '../store/hooks';
import { formatPrice } from '../utils/formatPrice';
import {
    CART_UPDATED_EVENT,
    getCart,
    getCartCount,
    notifyCartUpdated,
    removeFromCart,
    updateCartQuantity,
    type CartLine
} from '../utils/cartStorage';
import type { ApiEnvelope } from '../types/api';
import type { CatalogProduct, HomePageData } from '../types/catalog';
import { saveCheckoutSelection } from '../utils/checkoutStorage';


function CartQuantityControl({
    value,
    disabled = false,
    onDecrease,
    onIncrease,
    onChange,
    max
}: {
    value: number;
    disabled?: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
    onChange: (qty: number) => void;
    max?: number;
}) {
    return (
        <div className={`flex items-center gap-4 rounded-full bg-surface-container px-4 py-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
                type="button"
                onClick={onDecrease}
                disabled={disabled || value <= 1}
                className="material-symbols-outlined text-lg text-on-surface transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Giảm số lượng"
            >
                remove
            </button>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val === '') {
                        onChange(0);
                    } else {
                        const num = Number(val);
                        if (max != null && num > max) {
                            onChange(max);
                        } else {
                            onChange(num);
                        }
                    }
                }}
                onBlur={() => {
                    if (value < 1) {
                        onChange(1);
                    }
                }}
                className="w-8 text-center text-sm font-medium text-on-surface border-none bg-transparent outline-none focus:ring-0 p-0"
            />
            <button
                type="button"
                onClick={onIncrease}
                disabled={disabled || (max != null && value >= max)}
                className="material-symbols-outlined text-lg text-on-surface transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Tăng số lượng"
            >
                add
            </button>
        </div>
    );
}

function CartItemRow({
    item,
    selected,
    onToggleSelect,
    onQuantityChange,
    onRemove
}: {
    item: CartLine;
    selected: boolean;
    onToggleSelect: () => void;
    onQuantityChange: (qty: number) => void;
    onRemove: () => void;
}) {
    const lineTotal = item.price * item.quantity;
    const isOutOfStock = item.inStock === false;

    return (
        <article className={`flex flex-col items-center gap-6 rounded-xl bg-surface-container-lowest p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:flex-row ${isOutOfStock ? 'opacity-65' : ''}`}>
            <div className="flex items-center justify-center pr-2">
                <input
                    type="checkbox"
                    checked={selected}
                    disabled={isOutOfStock}
                    onChange={onToggleSelect}
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Chọn ${item.name}`}
                />
            </div>
            <Link
                to={`/products/${item.slug}`}
                className="h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-container-low"
            >
                <img
                    src={item.imageUrl || '/PremiumLaptop.png'}
                    alt={item.name}
                    className="h-full w-full object-cover"
                />
            </Link>
            <div className="flex-grow text-center sm:text-left">
                <Link to={`/products/${item.slug}`}>
                    <h3 className="mb-1 text-2xl font-semibold text-on-surface transition hover:text-primary">
                        {item.name}
                    </h3>
                </Link>
                <p className="mb-4 text-base text-on-surface-variant">
                    {formatPrice(item.price)} / sản phẩm
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                    <span
                        className={`text-sm font-medium ${isOutOfStock ? 'text-error' : 'text-outline'}`}
                    >
                        {isOutOfStock ? 'Hết hàng' : 'Còn hàng'}
                    </span>
                    {item.priceChanged && (
                        <>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/20" aria-hidden />
                            <span className="text-sm font-medium text-tertiary">Giá đã cập nhật</span>
                        </>
                    )}
                    {!isOutOfStock && (
                        <>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/20" aria-hidden />
                            <span className="text-sm font-medium text-primary">Đủ điều kiện giảm giá sinh viên</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex w-full flex-col items-end gap-4 sm:w-auto">
                <span className="text-2xl font-semibold text-on-surface">{formatPrice(lineTotal)}</span>
                <CartQuantityControl
                    value={item.quantity}
                    disabled={isOutOfStock}
                    onDecrease={() => onQuantityChange(item.quantity - 1)}
                    onIncrease={() => onQuantityChange(item.quantity + 1)}
                    onChange={(qty) => onQuantityChange(qty)}
                    max={item.stockQuantity}
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-sm font-medium text-error hover:underline"
                >
                    Xóa
                </button>
            </div>
        </article>
    );
}

function categoryLabel(product: CatalogProduct) {
    const c = product.category;
    if (!c) return 'Chung';
    if (c.parentName) return c.parentName;
    return c.name;
}

export default function CartPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const orderConfirmed = Boolean(
        (location.state as { orderConfirmed?: boolean } | null)?.orderConfirmed
    );
    const orderTotal = (location.state as { orderTotal?: number } | null)?.orderTotal;
    const orderNumber = (location.state as { orderNumber?: string } | null)?.orderNumber;
    const user = useAppSelector((state) => state.auth.user);
    const [items, setItems] = useState<CartLine[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isSelectionInitialized, setIsSelectionInitialized] = useState(false);
    const [recommended, setRecommended] = useState<CatalogProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);
    const [useApi, setUseApi] = useState(true);

    // Sync selection when items change
    useEffect(() => {
        if (items.length === 0) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds((prev) => {
            const inStockItemIds = new Set(
                items.filter((i) => i.inStock !== false).map((i) => Number(i.productId))
            );
            if (!isSelectionInitialized) {
                setIsSelectionInitialized(true);
                return new Set<number>(inStockItemIds);
            }
            const next = new Set<number>();
            prev.forEach((id) => {
                if (inStockItemIds.has(id)) {
                    next.add(id);
                }
            });
            return next;
        });
    }, [items, isSelectionInitialized]);

    const refreshLocalCart = useCallback(() => {
        setItems(getCart());
        notifyCartUpdated({ itemCount: getCartCount() });
    }, []);

    const loadCart = useCallback(async () => {
        setLoading(true);
        setActionError(null);
        try {
            if (user) {
                await mergeLocalCartToServer();
            }
            const cart = await fetchServerCart();
            setItems(apiItemsToCartLines(cart));
            notifyCartUpdated({ itemCount: cartItemCount(cart) });
            setUseApi(true);
        } catch {
            refreshLocalCart();
            setUseApi(false);
        } finally {
            setLoading(false);
        }
    }, [user, refreshLocalCart]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    useEffect(() => {
        const onUpdate = () => {
            if (!useApi) refreshLocalCart();
            else loadCart();
        };
        window.addEventListener(CART_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(CART_UPDATED_EVENT, onUpdate);
    }, [useApi, refreshLocalCart, loadCart]);

    useEffect(() => {
        let cancelled = false;
        async function loadRecommended() {
            try {
                const res = await axiosInstance.get<ApiEnvelope<HomePageData>>('/catalog/home');
                if (cancelled) return;
                const pool = [
                    ...(res.data.featured ?? []),
                    ...(res.data.bestSellers ?? []),
                    ...(res.data.newest ?? [])
                ];
                const cartIds = new Set(getCart().map((i) => i.productId));
                const seen = new Set<number>();
                const picks: CatalogProduct[] = [];
                for (const p of pool) {
                    if (cartIds.has(p.id) || seen.has(p.id)) continue;
                    seen.add(p.id);
                    picks.push(p);
                    if (picks.length >= 6) break;
                }
                setRecommended(picks);
            } catch {
                if (!cancelled) setRecommended([]);
            }
        }
        loadRecommended();
        return () => {
            cancelled = true;
        };
    }, [items.length]);

    const selectedItems = useMemo(
        () => items.filter((i) => selectedIds.has(Number(i.productId))),
        [items, selectedIds]
    );

    const subtotal = useMemo(
        () => selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
        [selectedItems]
    );

    const canCheckout = useMemo(
        () => selectedItems.length > 0 && !selectedItems.some((i) => i.inStock === false),
        [selectedItems]
    );

    const totalQuantity = useMemo(
        () => items.reduce((sum, i) => sum + i.quantity, 0),
        [items]
    );

    const inStockItems = useMemo(() => items.filter((i) => i.inStock !== false), [items]);

    const allSelected = inStockItems.length > 0 && inStockItems.every((i) => selectedIds.has(Number(i.productId)));

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(inStockItems.map((i) => Number(i.productId))));
        }
    };

    const toggleItem = (productId: number) => {
        const id = Number(productId);
        const item = items.find((i) => Number(i.productId) === id);
        if (item && item.inStock === false) return; // Ignore toggles for out of stock products
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleQuantityChange = async (item: CartLine, quantity: number) => {
        setActionError(null);
        try {
            if (useApi && item.cartItemId) {
                const cart = await updateServerCartItem(item.cartItemId, quantity);
                setItems(apiItemsToCartLines(cart));
            } else {
                updateCartQuantity(item.productId, quantity);
                refreshLocalCart();
            }
        } catch (err) {
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { message?: string })?.message || 'Không thể cập nhật số lượng';
            setActionError(msg);
        }
    };

    const handleProceedToCheckout = () => {
        const eligibleItems = selectedItems.filter((i) => i.inStock !== false);
        if (eligibleItems.length === 0) return;
        saveCheckoutSelection(eligibleItems.map((i) => Number(i.productId)));
        navigate('/checkout');
    };

    const handleRemove = async (item: CartLine) => {
        setActionError(null);
        try {
            if (useApi && item.cartItemId) {
                const cart = await removeServerCartItem(item.cartItemId);
                setItems(apiItemsToCartLines(cart));
            } else {
                removeFromCart(item.productId);
                refreshLocalCart();
            }
        } catch (err) {
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { message?: string })?.message || 'Không thể xóa sản phẩm';
            setActionError(msg);
        }
    };

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                <div className="mb-12 flex flex-wrap items-baseline gap-3">
                    <h1 className="text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
                        Giỏ hàng
                    </h1>
                    {!loading && totalQuantity > 0 && (
                        <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                            {totalQuantity} sản phẩm
                        </span>
                    )}
                </div>

                {orderConfirmed && (
                    <p className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
                        Đặt hàng thành công! Đơn hàng của bạn đang được xử lý.
                        {orderNumber && ` Mã đơn: ${orderNumber}.`}
                        {orderTotal != null && ` Tổng: ${formatPrice(orderTotal)}`}
                    </p>
                )}

                {actionError && (
                    <p className="mb-6 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        {actionError}
                    </p>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl bg-surface-container-lowest px-8 py-16 text-center">
                        <span
                            className="material-symbols-outlined mb-4 text-5xl text-outline-variant"
                            aria-hidden
                        >
                            shopping_cart
                        </span>
                        <p className="text-xl font-semibold text-on-surface">Giỏ hàng của bạn đang trống</p>
                        <p className="mt-2 text-on-surface-variant">
                            Hãy khám phá danh mục và thêm sản phẩm để bắt đầu mua sắm.
                        </p>
                        <Link
                            to="/categories"
                            className="mt-8 inline-block rounded-full bg-primary px-8 py-4 text-sm font-medium uppercase tracking-widest text-on-primary transition hover:bg-primary-container"
                        >
                            Xem sản phẩm
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
                        <div className="space-y-6 lg:col-span-8">
                            <div className="flex items-center gap-3 px-1">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    disabled={inStockItems.length === 0}
                                    onChange={toggleAll}
                                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Chọn tất cả sản phẩm"
                                />
                                <span className="text-sm font-medium text-on-surface-variant">
                                    Chọn tất cả ({inStockItems.length} sản phẩm còn hàng)
                                </span>
                            </div>
                            {items.map((item) => (
                                <CartItemRow
                                    key={item.cartItemId ?? item.productId}
                                    item={item}
                                    selected={selectedIds.has(Number(item.productId))}
                                    onToggleSelect={() => toggleItem(Number(item.productId))}
                                    onQuantityChange={(qty) => handleQuantityChange(item, qty)}
                                    onRemove={() => handleRemove(item)}
                                />
                            ))}
                        </div>

                        <div className="lg:col-span-4">
                            <div className="sticky top-28 rounded-xl bg-surface-container-high p-8">
                                <h2 className="mb-8 text-3xl font-semibold text-on-surface">Tóm tắt đơn hàng</h2>
                                <div className="mb-8 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base text-on-surface-variant">
                                            Tạm tính ({selectedItems.length} sản phẩm)
                                        </span>
                                        <span className="text-base text-on-surface">{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                                        <span className="text-2xl font-semibold text-on-surface">Tổng cộng</span>
                                        <span className="text-2xl font-semibold text-on-surface">
                                            {formatPrice(subtotal)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={!canCheckout}
                                    onClick={handleProceedToCheckout}
                                    className="w-full rounded-full bg-primary py-5 text-sm font-medium uppercase tracking-widest text-on-primary shadow-lg shadow-primary/10 transition hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Tiến hành thanh toán
                                </button>
                                <div className="mt-8 flex items-center justify-center gap-2 text-outline">
                                    <span
                                        className="material-symbols-outlined material-symbols-filled text-sm"
                                        aria-hidden
                                    >
                                        verified_user
                                    </span>
                                    <span className="text-xs font-semibold">Thanh toán an toàn UTEShop</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {recommended.length > 0 && (
                    <section className="mt-20">
                        <h2 className="mb-8 text-3xl font-semibold text-on-surface">
                            Đề xuất theo chuyên ngành của bạn
                        </h2>
                        <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-8 hide-scrollbar scroll-smooth sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                            {recommended.map((product) => (
                                <Link
                                    key={product.id}
                                    to={`/products/${product.slug}`}
                                    className="group min-w-[280px] cursor-pointer rounded-xl bg-surface-container-lowest p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
                                >
                                    <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-surface-container-low">
                                        <img
                                            src={product.imageUrl || '/PremiumLaptop.png'}
                                            alt={product.imageAlt || product.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <span className="mb-2 block text-xs font-semibold uppercase text-primary">
                                        {categoryLabel(product)}
                                    </span>
                                    <h4 className="mb-1 text-lg font-bold text-on-surface group-hover:text-primary">
                                        {product.name}
                                    </h4>
                                    <p className="text-base text-on-surface-variant">{formatPrice(product.price)}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <ShopFooter />
        </div>
    );
}
