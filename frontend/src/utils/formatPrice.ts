export function formatPrice(value: number | string | null | undefined): string {
    const n = Number(value);
    if (Number.isNaN(n)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(n);
}
