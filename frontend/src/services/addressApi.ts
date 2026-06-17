import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type { UserAddress, UserAddressPayload } from '../types/address';

interface AddressesResponse {
    addresses: UserAddress[];
}

interface AddressResponse {
    address: UserAddress;
}

export async function fetchMyAddresses(): Promise<UserAddress[]> {
    const res = await axiosInstance.get<ApiEnvelope<AddressesResponse>>('/users/me/addresses');
    return res.data.addresses;
}

export async function createUserAddress(payload: UserAddressPayload): Promise<UserAddress> {
    const res = await axiosInstance.post<ApiEnvelope<AddressResponse>>('/users/me/addresses', payload);
    return res.data.address;
}

export async function setDefaultAddress(id: number): Promise<UserAddress> {
    const res = await axiosInstance.put<ApiEnvelope<AddressResponse>>(`/users/me/addresses/${id}/default`);
    return res.data.address;
}

export async function deleteUserAddress(id: number): Promise<void> {
    await axiosInstance.delete<ApiEnvelope<void>>(`/users/me/addresses/${id}`);
}

export async function updateUserAddress(id: number, payload: UserAddressPayload): Promise<UserAddress> {
    const res = await axiosInstance.put<ApiEnvelope<AddressResponse>>(`/users/me/addresses/${id}`, payload);
    return res.data.address;
}
