import { useCallback, useEffect, useState } from 'react';
import { fetchCartItemCount } from '../services/cartApi';
import { useAppSelector } from '../store/hooks';
import { CART_UPDATED_EVENT, getCartCount, type CartUpdatedDetail } from '../utils/cartStorage';

export function useCartItemCount() {
    const user = useAppSelector((state) => state.auth.user);
    const [count, setCount] = useState(() => getCartCount());

    const refresh = useCallback(async () => {
        if (user) {
            const total = await fetchCartItemCount();
            setCount(total);
        } else {
            setCount(getCartCount());
        }
    }, [user]);

    useEffect(() => {
        void refresh();

        const onUpdate = (event: Event) => {
            const detail = (event as CustomEvent<CartUpdatedDetail>).detail;
            if (detail?.itemCount != null) {
                setCount(detail.itemCount);
                return;
            }
            void refresh();
        };

        window.addEventListener(CART_UPDATED_EVENT, onUpdate);
        window.addEventListener('storage', onUpdate);
        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, onUpdate);
            window.removeEventListener('storage', onUpdate);
        };
    }, [refresh]);

    return count;
}
