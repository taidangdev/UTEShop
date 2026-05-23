import { useCallback, useEffect, useState } from 'react';
import { previewCheckout } from '../services/checkoutApi';
import type { CheckoutInformation, CheckoutTotals } from '../types/checkout';
import { calculateCheckoutTotals } from '../utils/checkoutTotals';
import { apiTotalsToCheckoutTotals, cartItemDtoToLine } from '../utils/checkoutMappers';
import { getCheckoutProductIds } from '../utils/checkoutStorage';
import type { CartLine } from '../utils/cartStorage';

function isInformationComplete(info: CheckoutInformation) {
    return Boolean(
        info.fullName.trim() &&
            info.phone.trim() &&
            info.street.trim() &&
            info.city.trim() &&
            info.state.trim() &&
            info.postalCode.trim()
    );
}

export function useCheckoutPreview(
    information: CheckoutInformation,
    fallbackItems: CartLine[]
) {
    const [items, setItems] = useState<CartLine[]>(fallbackItems);
    const [totals, setTotals] = useState<CheckoutTotals>(() =>
        apiTotalsToCheckoutTotals(calculateCheckoutTotals(fallbackItems, information))
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const productIds = getCheckoutProductIds();
        if (productIds.length === 0) {
            setItems([]);
            setTotals(apiTotalsToCheckoutTotals(calculateCheckoutTotals([], information)));
            return;
        }

        if (!isInformationComplete(information)) {
            setItems(fallbackItems);
            setTotals(apiTotalsToCheckoutTotals(calculateCheckoutTotals(fallbackItems, information)));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await previewCheckout({ productIds, information });
            setItems(data.items.map(cartItemDtoToLine));
            setTotals(apiTotalsToCheckoutTotals(data.totals));
        } catch (err) {
            setItems(fallbackItems);
            setTotals(apiTotalsToCheckoutTotals(calculateCheckoutTotals(fallbackItems, information)));
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { message?: string })?.message || 'Could not refresh checkout preview';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [information, fallbackItems]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            refresh();
        }, 400);
        return () => window.clearTimeout(timer);
    }, [refresh]);

    useEffect(() => {
        setItems(fallbackItems);
    }, [fallbackItems]);

    return { items, totals, loading, error, refresh };
}
