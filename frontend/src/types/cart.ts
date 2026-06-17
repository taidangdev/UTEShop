export interface CartProductSnapshot {
    id: number;
    name: string;
    slug: string;
    categoryId?: number;
    shortDescription: string | null;
    price: number;
    status: string;
    stockQuantity: number;
    imageUrl: string | null;
    imageAlt: string | null;
}

export interface CartVariantSnapshot {
    id: number;
    name: string;
    price: number | null;
    stockQuantity: number;
    isActive: boolean;
}

export interface CartItemDto {
    id: number;
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    currentUnitPrice: number;
    inStock: boolean;
    priceChanged: boolean;
    product: CartProductSnapshot | null;
    variant: CartVariantSnapshot | null;
}

export interface CartDto {
    id: number;
    status: string;
    items: CartItemDto[];
    subtotal: number;
    itemCount: number;
}

export interface CartResponseData {
    cart: CartDto;
}
