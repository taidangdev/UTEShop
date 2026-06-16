export interface UserAddress {
    id: number;
    userId: number;
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    ward?: string | null;
    district?: string | null;
    city: string;
    isDefault: boolean;
    label?: 'home' | 'campus' | 'work' | 'other' | string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserAddressPayload {
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string;
    ward?: string;
    district?: string;
    city: string;
    isDefault?: boolean;
    label?: string;
}
