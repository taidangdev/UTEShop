import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../services/axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type {
    ProfileMeResponse,
    ProfileOrder,
    ProfileReview,
    ProfileState,
    ProfileUpdatePayload
} from '../types/profile';

export const fetchUserProfile = createAsyncThunk<
    ProfileMeResponse,
    void,
    { rejectValue: string }
>('profile/fetchUserProfile', async (_, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get<ApiEnvelope<ProfileMeResponse>>('/users/me');
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Lỗi khi tải thông tin';
        return rejectWithValue(msg);
    }
});

export const fetchMyOrders = createAsyncThunk<ProfileOrder[], void, { rejectValue: string }>(
    'profile/fetchMyOrders',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get<ApiEnvelope<{ orders: ProfileOrder[] }>>(
                '/users/me/orders'
            );
            return response.data.orders;
        } catch (error) {
            const msg =
                typeof error === 'string'
                    ? error
                    : (error as { message?: string })?.message || 'Could not load orders';
            return rejectWithValue(msg);
        }
    }
);

export const fetchMyReviews = createAsyncThunk<ProfileReview[], void, { rejectValue: string }>(
    'profile/fetchMyReviews',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get<ApiEnvelope<{ reviews: ProfileReview[] }>>(
                '/users/me/reviews'
            );
            return response.data.reviews;
        } catch (error) {
            const msg =
                typeof error === 'string'
                    ? error
                    : (error as { message?: string })?.message || 'Could not load reviews';
            return rejectWithValue(msg);
        }
    }
);

export const updateUserProfile = createAsyncThunk<
    ProfileMeResponse,
    ProfileUpdatePayload,
    { rejectValue: string }
>('profile/updateUserProfile', async (userData, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.put<ApiEnvelope<ProfileMeResponse>>(
            '/users/profile',
            userData
        );
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Cập nhật thất bại';
        return rejectWithValue(msg);
    }
});

const initialState: ProfileState = {
    user: null,
    stats: null,
    orders: [],
    reviews: [],
    ordersLoading: false,
    reviewsLoading: false,
    isLoading: false,
    isUpdating: false,
    error: null,
    ordersError: null,
    reviewsError: null,
    updateSuccess: false
};

const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        clearStatus: (state) => {
            state.error = null;
            state.updateSuccess = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.stats = action.payload.stats;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null;
            })
            .addCase(fetchMyOrders.pending, (state) => {
                state.ordersLoading = true;
                state.ordersError = null;
            })
            .addCase(fetchMyOrders.fulfilled, (state, action) => {
                state.ordersLoading = false;
                state.orders = action.payload;
            })
            .addCase(fetchMyOrders.rejected, (state, action) => {
                state.ordersLoading = false;
                state.ordersError = action.payload ?? null;
            })
            .addCase(fetchMyReviews.pending, (state) => {
                state.reviewsLoading = true;
                state.reviewsError = null;
            })
            .addCase(fetchMyReviews.fulfilled, (state, action) => {
                state.reviewsLoading = false;
                state.reviews = action.payload;
            })
            .addCase(fetchMyReviews.rejected, (state, action) => {
                state.reviewsLoading = false;
                state.reviewsError = action.payload ?? null;
            })
            .addCase(updateUserProfile.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
                state.updateSuccess = false;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.isUpdating = false;
                state.user = action.payload.user;
                state.stats = action.payload.stats;
                state.updateSuccess = true;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload ?? null;
                state.updateSuccess = false;
            });
    }
});

export const { clearStatus } = profileSlice.actions;
export default profileSlice.reducer;
