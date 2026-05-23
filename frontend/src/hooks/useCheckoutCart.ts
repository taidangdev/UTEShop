import { useCallback, useEffect, useState } from 'react';
import { apiItemsToCartLines, fetchServerCart, mergeLocalCartToServer } from '../services/cartApi';
import { useAppSelector } from '../store/hooks';
import { getCart, type CartLine } from '../utils/cartStorage';
import { getCheckoutProductIds } from '../utils/checkoutStorage';

export function useCheckoutCart() {
    const user = useAppSelector((state) => state.auth.user);
    const [items, setItems] = useState<CartLine[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const selectedIds = getCheckoutProductIds();
        if (selectedIds.length === 0) {
            setItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            if (user) {
                await mergeLocalCartToServer();
            }
            const cart = await fetchServerCart();
            const lines = apiItemsToCartLines(cart).filter((line) =>
                selectedIds.includes(line.productId)
            );
            setItems(lines);
        } catch {
            const lines = getCart().filter((line) => selectedIds.includes(line.productId));
            setItems(lines);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        load();
    }, [load]);

    return { items, loading, reload: load };
}
