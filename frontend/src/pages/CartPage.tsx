import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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

function CartFooter() {
    return (
        <footer className="mt-20 w-full border-t border-outline-variant/30 bg-surface-container-low">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 py-20 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
                <div>
                    <div className="mb-4 text-2xl font-bold text-on-surface">UTEShop</div>
                    <p className="mb-4 max-w-xs text-base text-on-surface-variant">
                        Engineering Excellence. Delivered daily to the innovators of tomorrow.
                    </p>
                </div>
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">Resources</h4>
                    <nav className="flex flex-col gap-3">
                        <a href="/#support" className="text-sm text-on-surface-variant hover:text-primary">
                            Academic Support
                        </a>
                        <Link to="/categories" className="text-sm text-on-surface-variant hover:text-primary">
                            Student Discounts
                        </Link>
                        <a href="/#support" className="text-sm text-on-surface-variant hover:text-primary">
                            Warranty &amp; Repairs
                        </a>
                    </nav>
                </div>
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">Company</h4>
                    <nav className="flex flex-col gap-3">
                        <a href="/#support" className="text-sm text-on-surface-variant hover:text-primary">
                            Privacy Policy
                        </a>
                        <Link to="/profile" className="text-sm text-on-surface-variant hover:text-primary">
                            Faculty Portal
                        </Link>
                    </nav>
                </div>
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">Newsletter</h4>
                    <p className="mb-4 text-sm text-on-surface-variant">Get hardware updates and lab guides.</p>
                    <div className="flex overflow-hidden rounded-full border border-outline-variant">
                        <input
                            type="email"
                            placeholder="edu-email"
                            className="w-full border-none bg-transparent px-4 py-2 text-sm focus:ring-0"
                        />
                        <button type="button" className="bg-primary px-4 text-sm font-medium text-on-primary">
                            Join
                        </button>
                    </div>
                </div>
            </div>
            <div className="border-t border-outline-variant/30 px-6 py-8 text-center lg:text-left">
                <p className="mx-auto max-w-[1280px] text-sm text-outline lg:px-8">
                    © 2024 UTEShop Technology. Engineering Excellence.
                </p>
            </div>
        </footer>
    );
}

function CartQuantityControl({
    value,
    onDecrease,
    onIncrease
}: {
    value: number;
    onDecrease: () => void;
    onIncrease: () => void;
}) {
    return (
        <div className="flex items-center gap-4 rounded-full bg-surface-container px-4 py-2">
            <button
                type="button"
                onClick={onDecrease}
                disabled={value <= 1}
                className="material-symbols-outlined text-lg text-on-surface transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease quantity"
            >
                remove
            </button>
            <span className="w-4 text-center text-sm font-medium text-on-surface" aria-live="polite">
                {value}
            </span>
            <button
                type="button"
                onClick={onIncrease}
                className="material-symbols-outlined text-lg text-on-surface transition hover:text-primary"
                aria-label="Increase quantity"
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

    return (
        <article className="flex flex-col items-center gap-6 rounded-xl bg-surface-container-lowest p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:flex-row">
            <div className="flex items-center justify-center pr-2">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggleSelect}
                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                    aria-label={`Select ${item.name}`}
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
                    {formatPrice(item.price)} each
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                    <span
                        className={`text-sm font-medium ${item.inStock === false ? 'text-error' : 'text-outline'}`}
                    >
                        {item.inStock === false ? 'Out of Stock' : 'In Stock'}
                    </span>
                    {item.priceChanged && (
                        <>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/20" aria-hidden />
                            <span className="text-sm font-medium text-tertiary">Price updated</span>
                        </>
                    )}
                    {item.inStock !== false && (
                        <>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/20" aria-hidden />
                            <span className="text-sm font-medium text-primary">Student Discount Eligible</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex w-full flex-col items-end gap-4 sm:w-auto">
                <span className="text-2xl font-semibold text-on-surface">{formatPrice(lineTotal)}</span>
                <CartQuantityControl
                    value={item.quantity}
                    onDecrease={() => onQuantityChange(item.quantity - 1)}
                    onIncrease={() => onQuantityChange(item.quantity + 1)}
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-sm font-medium text-error hover:underline"
                >
                    Remove
                </button>
            </div>
        </article>
    );
}

function categoryLabel(product: CatalogProduct) {
    const c = product.category;
    if (!c) return 'General';
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
            const itemIds = new Set(items.map((i) => Number(i.productId)));
            if (!isSelectionInitialized) {
                setIsSelectionInitialized(true);
                return new Set<number>(itemIds);
            }
            const next = new Set<number>();
            prev.forEach((id) => {
                if (itemIds.has(id)) {
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

    const totalQuantity = useMemo(
        () => items.reduce((sum, i) => sum + i.quantity, 0),
        [items]
    );

    const allSelected = items.length > 0 && items.every((i) => selectedIds.has(Number(i.productId)));

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map((i) => Number(i.productId))));
        }
    };

    const toggleItem = (productId: number) => {
        const id = Number(productId);
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
                    : (err as { message?: string })?.message || 'Could not update quantity';
            setActionError(msg);
        }
    };

    const handleProceedToCheckout = () => {
        if (selectedItems.length === 0) return;
        saveCheckoutSelection(selectedItems.map((i) => Number(i.productId)));
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
                    : (err as { message?: string })?.message || 'Could not remove item';
            setActionError(msg);
        }
    };

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                <div className="mb-12 flex flex-wrap items-baseline gap-3">
                    <h1 className="text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
                        Your Cart
                    </h1>
                    {!loading && totalQuantity > 0 && (
                        <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                            {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                        </span>
                    )}
                </div>

                {orderConfirmed && (
                    <p className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
                        Order confirmed! Your technical gear is on its way.
                        {orderNumber && ` Order #${orderNumber}.`}
                        {orderTotal != null && ` Total: ${formatPrice(orderTotal)}`}
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
                        <p className="text-xl font-semibold text-on-surface">Your cart is empty</p>
                        <p className="mt-2 text-on-surface-variant">
                            Browse the catalog and add items to get started.
                        </p>
                        <Link
                            to="/categories"
                            className="mt-8 inline-block rounded-full bg-primary px-8 py-4 text-sm font-medium uppercase tracking-widest text-on-primary transition hover:bg-primary-container"
                        >
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
                        <div className="space-y-6 lg:col-span-8">
                            <div className="flex items-center gap-3 px-1">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                                    aria-label="Select all items"
                                />
                                <span className="text-sm font-medium text-on-surface-variant">
                                    Select all ({items.length}{' '}
                                    {items.length === 1 ? 'product' : 'products'}, {totalQuantity}{' '}
                                    {totalQuantity === 1 ? 'item' : 'items'})
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
                                <h2 className="mb-8 text-3xl font-semibold text-on-surface">Order Summary</h2>
                                <div className="mb-8 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base text-on-surface-variant">
                                            Subtotal ({selectedItems.length} items)
                                        </span>
                                        <span className="text-base text-on-surface">{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                                        <span className="text-2xl font-semibold text-on-surface">Total</span>
                                        <span className="text-2xl font-semibold text-on-surface">
                                            {formatPrice(subtotal)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={selectedItems.length === 0}
                                    onClick={handleProceedToCheckout}
                                    className="w-full rounded-full bg-primary py-5 text-sm font-medium uppercase tracking-widest text-on-primary shadow-lg shadow-primary/10 transition hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Proceed to Checkout
                                </button>
                                <div className="mt-8 flex items-center justify-center gap-2 text-outline">
                                    <span
                                        className="material-symbols-outlined material-symbols-filled text-sm"
                                        aria-hidden
                                    >
                                        verified_user
                                    </span>
                                    <span className="text-xs font-semibold">Secure University Checkout</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {recommended.length > 0 && (
                    <section className="mt-20">
                        <h2 className="mb-8 text-3xl font-semibold text-on-surface">
                            Recommended for Your Major
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
            <CartFooter />
        </div>
    );
}
