import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { CatalogProduct } from '../types/catalog';

export async function toggleWishlistApi(productId: number): Promise<{ isWishlisted: boolean }> {
    const res = await axiosInstance.post<ApiEnvelope<{ isWishlisted: boolean }>>('/wishlist/toggle', {
        productId
    });
    return res.data;
}

export async function fetchWishlistApi(): Promise<CatalogProduct[]> {
    const res = await axiosInstance.get<ApiEnvelope<{ products: CatalogProduct[] }>>('/wishlist');
    return res.data.products ?? [];
}
