const CART_KEY = 'uteshop_cart';

export const CART_UPDATED_EVENT = 'uteshop:cart-updated';

export interface CartUpdatedDetail {
    itemCount?: number;
}

export function notifyCartUpdated(detail?: CartUpdatedDetail) {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail }));
}

export interface CartLine {
    cartItemId?: number;
    productId: number;
    slug: string;
    name: string;
    price: number;
    imageUrl: string | null;
    quantity: number;
    inStock?: boolean;
    priceChanged?: boolean;
    categoryId?: number;
}

function readCart(): CartLine[] {
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
        return [];
    }
}

function writeCart(items: CartLine[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function getCart(): CartLine[] {
    return readCart();
}

export function addToCart(line: Omit<CartLine, 'quantity'> & { quantity: number }) {
    const items = readCart();
    const idx = items.findIndex((i) => i.productId === line.productId);
    if (idx >= 0) {
        items[idx].quantity += line.quantity;
    } else {
        items.push({ ...line });
    }
    writeCart(items);
    notifyCartUpdated({ itemCount: getCartCount() });
    return items;
}

export function updateCartQuantity(productId: number, quantity: number) {
    const items = readCart();
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) return items;
    if (quantity < 1) {
        items.splice(idx, 1);
    } else {
        items[idx].quantity = quantity;
    }
    writeCart(items);
    notifyCartUpdated({ itemCount: getCartCount() });
    return items;
}

export function removeFromCart(productId: number) {
    const items = readCart().filter((i) => i.productId !== productId);
    writeCart(items);
    notifyCartUpdated({ itemCount: getCartCount() });
    return items;
}

export function clearLocalCart() {
    writeCart([]);
    notifyCartUpdated({ itemCount: 0 });
}

export function getCartCount(): number {
    return readCart().reduce((sum, i) => sum + i.quantity, 0);
}
