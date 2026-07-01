export function formatPrice(value: number | string | null | undefined): string {
    const n = Number(value);
    if (Number.isNaN(n)) return '0 VNĐ';
    const formatted = new Intl.NumberFormat('vi-VN').format(n * 1000);
    return `${formatted} VNĐ`;
}
