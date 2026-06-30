import axiosInstance from './axiosConfig';
import type { ApiEnvelope, PaginationMeta } from '../types/api';
import type {
    Consignment,
    ConsignmentFormOptions,
    CreateConsignmentPayload
} from '../types/consignment';

export interface ConsignmentListResponse {
    consignments: Consignment[];
    pagination: PaginationMeta;
}

export async function fetchMyConsignments(
    page = 1,
    limit = 10
): Promise<ConsignmentListResponse> {
    const res = await axiosInstance.get<ApiEnvelope<ConsignmentListResponse>>(
        `/users/me/consignments`,
        {
            params: { page, limit }
        }
    );
    return res.data;
}

export async function fetchConsignmentFormOptions(): Promise<ConsignmentFormOptions> {
    const res = await axiosInstance.get<ApiEnvelope<ConsignmentFormOptions>>(
        `/users/me/consignments/form-options`
    );
    return res.data;
}

export async function createConsignment(
    payload: CreateConsignmentPayload
): Promise<Consignment> {
    const res = await axiosInstance.post<ApiEnvelope<Consignment>>(
        `/users/me/consignments`,
        payload
    );
    return res.data;
}

export async function updateConsignment(
    id: number,
    payload: CreateConsignmentPayload
): Promise<Consignment> {
    const res = await axiosInstance.put<ApiEnvelope<Consignment>>(
        `/users/me/consignments/${id}`,
        payload
    );
    return res.data;
}

export async function deleteConsignment(id: number): Promise<{ message: string }> {
    const res = await axiosInstance.delete<ApiEnvelope<{ message: string }>>(
        `/users/me/consignments/${id}`
    );
    return res.data;
}

export async function uploadConsignmentImage(base64Image: string): Promise<string> {
    const res = await axiosInstance.post<ApiEnvelope<{ url: string }>>(
        `/users/upload`,
        { image: base64Image }
    );
    return res.data.url;
}

