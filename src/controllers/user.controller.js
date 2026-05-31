const userService = require('../services/user.service');
const profileService = require('../services/profile.service');
const loyaltyService = require('../services/loyalty.service');
const couponService = require('../services/coupon.service');
const { successResponse } = require('../utils/responseHandler');

const getMe = async (req, res, next) => {
    try {
        const user = await userService.getUserPublicById(req.user.id);
        const stats = await profileService.getUserStats(req.user.id);
        return successResponse(res, 200, 'OK', {
            user: profileService.serializeUser(user),
            stats
        });
    } catch (error) {
        next(error);
    }
};

const getMyOrders = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const data = await profileService.listUserOrders(req.user.id, { page, limit });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getMyReviews = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const data = await profileService.listUserReviews(req.user.id, { page, limit });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getMyPoints = async (req, res, next) => {
    try {
        const data = await loyaltyService.listTransactions(req.user.id, {
            page: req.query.page,
            limit: req.query.limit
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getMyCoupons = async (req, res, next) => {
    try {
        const coupons = await couponService.listActiveCoupons(req.user.id);
        return successResponse(res, 200, 'OK', { coupons });
    } catch (error) {
        next(error);
    }
};

const requestEditProfileOtp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await userService.requestEditProfileOtp(userId);
        return successResponse(res, 200, result.message);
    } catch (error) {
        next(error);
    }
};

/**
 * Controller: Cập nhật thông tin User (Edit Profile)
 * - Người dùng chỉ có thể cập nhật thông tin của chính họ (trừ phi là admin)
 * - Yêu cầu phải xác thực qua auth.middleware (req.user phải tồn tại)
 */
const editProfile = async (req, res, next) => {
    try {
        // Lấy ID user từ token (được set trong verifyToken middleware)
        const userId = req.user.id; 
        
        // Lấy dữ liệu update từ body request
        // Cần đảm bảo frontend chỉ gửi các trường được phép cập nhật
        const { otp, ...updateData } = req.body;

        // Xóa các trường không cho phép update trực tiếp qua API này
        delete updateData.password;
        delete updateData.role; 
        delete updateData.id;
        delete updateData.email; // Không cho đổi email qua API này để tránh phức tạp hóa OTP logic
        delete updateData.username; // Không cho đổi username

        // Gọi service xử lý nghiệp vụ
        await userService.updateUserProfile(userId, updateData, otp);
        const user = await userService.getUserPublicById(userId);
        const stats = await profileService.getUserStats(userId);

        return successResponse(res, 200, 'Profile updated successfully', {
            user: profileService.serializeUser(user),
            stats
        });
    } catch (error) {
        next(error); // Đẩy lỗi cho Error Middleware xử lý
    }
};

module.exports = {
    getMe,
    getMyOrders,
    getMyReviews,
    getMyPoints,
    getMyCoupons,
    requestEditProfileOtp,
    editProfile
};
