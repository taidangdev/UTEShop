import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CheckoutFooter from '../components/checkout/CheckoutFooter';
import CheckoutOrderSummary from '../components/checkout/CheckoutOrderSummary';
import CheckoutStepper from '../components/checkout/CheckoutStepper';
import { useCheckoutCart } from '../hooks/useCheckoutCart';
import { useCheckoutPreview } from '../hooks/useCheckoutPreview';
import { placeOrder } from '../services/checkoutApi';
import type { PaymentMethod } from '../types/checkout';
import {
    clearCheckoutSession,
    getCheckoutInformation,
    getCheckoutProductIds,
    getPaymentMethod,
    hasCheckoutSelection,
    savePaymentMethod
} from '../utils/checkoutStorage';
import { clearLocalCart } from '../utils/cartStorage';

const cardInputClass =
    'h-12 w-full rounded-lg border-none bg-surface-container-low px-4 outline-none transition focus:ring-2 focus:ring-primary-container';

function PaymentOption({
    id,
    name,
    title,
    subtitle,
    icon,
    checked,
    onChange,
    children
}: {
    id: string;
    name: string;
    title: string;
    subtitle: string;
    icon: string;
    checked: boolean;
    onChange: () => void;
    children?: ReactNode;
}) {
    return (
        <div className="relative">
            <input
                type="radio"
                id={id}
                name={name}
                checked={checked}
                onChange={onChange}
                className="peer hidden"
            />
            <label
                htmlFor={id}
                className={`flex cursor-pointer flex-col rounded-lg border p-6 transition-all duration-200 hover:border-primary ${
                    checked ? 'border-primary bg-primary/5' : 'border-outline-variant'
                }`}
            >
                <div className="flex items-start">
                    <div
                        className={`mr-4 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            checked ? 'border-primary' : 'border-outline-variant'
                        }`}
                    >
                        <div
                            className={`h-2.5 w-2.5 rounded-full transition-opacity ${
                                checked ? 'bg-primary opacity-100' : 'opacity-0'
                            }`}
                        />
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                        <div>
                            <p className="text-sm font-bold">{title}</p>
                            <p className="text-base text-on-surface-variant">{subtitle}</p>
                        </div>
                        <span className="material-symbols-outlined text-outline">{icon}</span>
                    </div>
                </div>
                {checked && children ? <div className="ml-9 mt-8 max-w-md space-y-4">{children}</div> : null}
            </label>
        </div>
    );
}

export default function CheckoutPaymentPage() {
    const navigate = useNavigate();
    const { items: cartItems, loading: cartLoading } = useCheckoutCart();
    const information = getCheckoutInformation();
    const {
        items,
        totals,
        loading: previewLoading,
        error: previewError
    } = useCheckoutPreview(information, cartItems);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => getPaymentMethod());
    const [processing, setProcessing] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');

    useEffect(() => {
        if (!hasCheckoutSelection()) {
            navigate('/cart', { replace: true });
            return;
        }
        if (!information.fullName.trim()) {
            navigate('/checkout', { replace: true });
        }
    }, [navigate, information.fullName]);

    const handleConfirm = async () => {
        setProcessing(true);
        setSubmitError(null);
        savePaymentMethod(paymentMethod);

        try {
            const result = await placeOrder({
                productIds: getCheckoutProductIds(),
                information,
                paymentMethod
            });

            clearCheckoutSession();
            clearLocalCart();
            navigate('/cart', {
                replace: true,
                state: {
                    orderConfirmed: true,
                    orderTotal: result.order.total,
                    orderNumber: result.order.orderNumber
                }
            });
        } catch (err) {
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { message?: string })?.message || 'Could not place order';
            setSubmitError(msg);
        } finally {
            setProcessing(false);
        }
    };

    const loading = cartLoading || previewLoading;

    if (!loading && items.length === 0) {
        return (
            <div className="min-h-screen bg-surface px-6 py-20 text-center">
                <p className="text-lg text-on-surface-variant">No items selected for checkout.</p>
                <Link to="/cart" className="mt-6 inline-block text-primary hover:underline">
                    Back to Cart
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <div className="sticky top-0 z-40 border-b border-outline-variant/30 bg-surface/80 shadow-sm backdrop-blur-xl">
                <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
                    <Link to="/" className="text-2xl font-bold tracking-tight text-on-surface">
                        UTEShop
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link
                            to="/cart"
                            className="text-sm font-medium text-on-surface-variant transition hover:text-primary"
                        >
                            Back to Cart
                        </Link>
                        <span className="material-symbols-outlined text-outline">lock</span>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
                <CheckoutStepper currentStep={2} />

                {(previewError || submitError) && (
                    <p className="mb-6 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                        {submitError || previewError}
                    </p>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-10 lg:col-span-8">
                        <section>
                            <h1 className="mb-8 text-3xl font-semibold text-on-surface">Select Payment Method</h1>
                            <div className="space-y-4">
                                <PaymentOption
                                    id="cash_payment"
                                    name="payment_method"
                                    title="Tiền mặt"
                                    subtitle="Cash"
                                    icon="payments"
                                    checked={paymentMethod === 'cash'}
                                    onChange={() => setPaymentMethod('cash')}
                                />
                                <PaymentOption
                                    id="bank_transfer"
                                    name="payment_method"
                                    title="Chuyển khoản"
                                    subtitle="Bank Transfer"
                                    icon="account_balance"
                                    checked={paymentMethod === 'bank_transfer'}
                                    onChange={() => setPaymentMethod('bank_transfer')}
                                />
                                <PaymentOption
                                    id="credit_card"
                                    name="payment_method"
                                    title="Thẻ"
                                    subtitle="Credit / Debit Card"
                                    icon="credit_card"
                                    checked={paymentMethod === 'credit_card'}
                                    onChange={() => setPaymentMethod('credit_card')}
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-on-surface-variant">
                                            Card Number
                                        </label>
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            placeholder="0000 0000 0000 0000"
                                            className={cardInputClass}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-on-surface-variant">
                                                Expiry Date
                                            </label>
                                            <input
                                                type="text"
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(e.target.value)}
                                                placeholder="MM/YY"
                                                className={cardInputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-on-surface-variant">
                                                CVV
                                            </label>
                                            <input
                                                type="text"
                                                value={cardCvc}
                                                onChange={(e) => setCardCvc(e.target.value)}
                                                placeholder="123"
                                                className={cardInputClass}
                                            />
                                        </div>
                                    </div>
                                </PaymentOption>
                            </div>
                        </section>

                        <div className="flex flex-col items-center gap-4 pt-8 sm:flex-row">
                            <Link
                                to="/checkout"
                                className="h-14 w-full rounded-full bg-surface-container-low px-8 text-sm font-medium text-on-surface transition hover:bg-surface-container-high active:scale-95 sm:w-auto"
                            >
                                Back to Information
                            </Link>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={processing || loading}
                                className="h-14 w-full rounded-full bg-primary-container px-12 text-sm font-medium text-on-primary transition hover:bg-primary hover:shadow-lg active:scale-95 disabled:opacity-60 sm:w-auto"
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Processing...
                                    </span>
                                ) : (
                                    'Confirm'
                                )}
                            </button>
                        </div>
                    </div>

                    <aside className="lg:col-span-4">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            </div>
                        ) : (
                            <div className="rounded-xl bg-surface-container-lowest p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                                <CheckoutOrderSummary
                                    items={items}
                                    totals={totals}
                                    information={information}
                                    compact
                                />
                                <div className="mt-8 flex items-start gap-3 rounded-lg bg-tertiary-fixed p-4 text-on-tertiary-fixed-variant">
                                    <span className="material-symbols-outlined mt-0.5">verified_user</span>
                                    <div>
                                        <p className="text-xs font-bold">Secure University Billing</p>
                                        <p className="mt-1 text-[11px] leading-tight">
                                            Transaction is encrypted via UTE Enterprise Security Protocols.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            <CheckoutFooter />
        </div>
    );
}
