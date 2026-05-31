import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { CartDto, CartResponseData } from '../types/cart';
import {
    clearLocalCart,
    getCart,
    getCartCount,
    notifyCartUpdated,
    type CartLine
} from '../utils/cartStorage';

export function cartItemCount(cart: CartDto): number {
    if (typeof cart.itemCount === 'number') {
        return cart.itemCount;
    }
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function apiItemsToCartLines(cart: CartDto): CartLine[] {
    return cart.items
        .filter((item) => item.product)
        .map((item) => ({
            cartItemId: item.id,
            productId: item.productId,
            slug: item.product!.slug,
            name: item.product!.name,
            price: item.unitPrice,
            imageUrl: item.product!.imageUrl,
            quantity: item.quantity,
            inStock: item.inStock,
            priceChanged: item.priceChanged
        }));
}

export async function fetchServerCart(): Promise<CartDto> {
    const res = await axiosInstance.get<ApiEnvelope<CartResponseData>>('/cart');
    return res.data.cart;
}

export async function addItemToServerCart(payload: {
    productId: number;
    variantId?: number | null;
    quantity?: number;
}): Promise<CartDto> {
    const res = await axiosInstance.post<ApiEnvelope<CartResponseData>>('/cart/items', payload);
    const cart = res.data.cart;
    notifyCartUpdated({ itemCount: cartItemCount(cart) });
    return cart;
}

export async function updateServerCartItem(itemId: number, quantity: number): Promise<CartDto> {
    const res = await axiosInstance.put<ApiEnvelope<CartResponseData>>(`/cart/items/${itemId}`, {
        quantity
    });
    const cart = res.data.cart;
    notifyCartUpdated({ itemCount: cartItemCount(cart) });
    return cart;
}

export async function removeServerCartItem(itemId: number): Promise<CartDto> {
    const res = await axiosInstance.delete<ApiEnvelope<CartResponseData>>(`/cart/items/${itemId}`);
    const cart = res.data.cart;
    notifyCartUpdated({ itemCount: cartItemCount(cart) });
    return cart;
}

export async function clearServerCart(): Promise<CartDto> {
    const res = await axiosInstance.delete<ApiEnvelope<CartResponseData>>('/cart');
    const cart = res.data.cart;
    notifyCartUpdated({ itemCount: cartItemCount(cart) });
    return cart;
}

export async function mergeLocalCartToServer(): Promise<CartDto | null> {
    const local = getCart();
    if (local.length === 0) return null;

    const res = await axiosInstance.post<ApiEnvelope<CartResponseData>>('/cart/merge', {
        items: local.map((line) => ({
            productId: line.productId,
            quantity: line.quantity
        }))
    });
    clearLocalCart();
    const cart = res.data.cart;
    notifyCartUpdated({ itemCount: cartItemCount(cart) });
    return cart;
}

export async function fetchCartItemCount(): Promise<number> {
    try {
        const cart = await fetchServerCart();
        return cartItemCount(cart);
    } catch {
        return getCartCount();
    }
}
