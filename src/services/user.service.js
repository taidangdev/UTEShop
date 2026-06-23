const User = require('../models/user.model');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const redisClient = require('../config/redis');
const { sendEditProfileOtp, sendChangePasswordOtp } = require('./mail.service');
const {
    otpKeysForEmailInput,
    EDIT_PROFILE_OTP_PREFIX,
    CHANGE_PASSWORD_OTP_PREFIX
} = require('../utils/otpRedisKeys');
const { normalizeOtpDigits } = require('../utils/otpDigits');

const OTP_TTL_SEC = Number(process.env.OTP_TTL_SECONDS) || 600;

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const redisSetOtp = async (prefix, emailInput, otp) => {
    const keys = otpKeysForEmailInput(prefix, emailInput);
    for (const k of keys) {
        await redisClient.set(k, otp, { EX: OTP_TTL_SEC });
    }
};

const redisClearOtp = async (prefix, emailInput) => {
    const keys = otpKeysForEmailInput(prefix, emailInput);
    for (const k of keys) {
        await redisClient.del(k);
    }
};

const requestEditProfileOtp = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const otp = generateOtp();
    await redisSetOtp(EDIT_PROFILE_OTP_PREFIX, user.email, otp);
    await sendEditProfileOtp(user.email, otp, OTP_TTL_SEC);

    return { message: 'OTP đã được gửi đến email của bạn để xác thực thay đổi thông tin.' };
};

/**
 * Service: Cập nhật Profile User trong Database
 */
const updateUserProfile = async (userId, updateData, otp) => {
    if (!otp) {
        const error = new Error('Vui lòng cung cấp mã OTP để cập nhật thông tin');
        error.statusCode = 400;
        throw error;
    }

    // 1. Tìm User trong DB
    const user = await User.findByPk(userId);
    
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // Xác thực OTP
    const otpDigits = normalizeOtpDigits(otp);
    if (otpDigits.length !== 6) {
        const err = new Error('Mã OTP phải gồm đúng 6 chữ số');
        err.statusCode = 400;
        throw err;
    }

    const keys = otpKeysForEmailInput(EDIT_PROFILE_OTP_PREFIX, user.email);
    const storedVals = await Promise.all(keys.map((k) => redisClient.get(k)));
    let otpValid = false;

    for (let i = 0; i < keys.length; i += 1) {
        const raw = storedVals[i];
        if (raw && normalizeOtpDigits(raw) === otpDigits) {
            otpValid = true;
            break;
        }
    }

    if (!otpValid) {
        const err = new Error('OTP không đúng hoặc đã hết hạn');
        err.statusCode = 400;
        throw err;
    }

    // 2. Thực hiện update dữ liệu
    await user.update(updateData);
    
    // Xóa OTP
    await redisClearOtp(EDIT_PROFILE_OTP_PREFIX, user.email);

    return user;
};

const getUserPublicById = async (userId) => {
    const { User: UserModel, Major } = require('../models');
    const user = await UserModel.findByPk(userId, {
        attributes: [
            'id',
            'username',
            'email',
            'fullName',
            'phone',
            'address',
            'role',
            'status',
            'studentId',
            'majorId',
            'avatarUrl',
            'emailVerifiedAt',
            'loyaltyPoints',
            'createdAt',
            'updatedAt'
        ],
        include: [{ model: Major, as: 'major', attributes: ['id', 'code', 'name'], required: false }]
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

const requestChangePasswordOtp = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const otp = generateOtp();
    await redisSetOtp(CHANGE_PASSWORD_OTP_PREFIX, user.email, otp);
    await sendChangePasswordOtp(user.email, otp, OTP_TTL_SEC);

    return { message: 'OTP đã được gửi đến email của bạn để xác thực thay đổi mật khẩu.' };
};

const changePasswordWithOtp = async (userId, currentPassword, newPassword, otp) => {
    if (!otp) {
        const error = new Error('Vui lòng cung cấp mã OTP để xác nhận đổi mật khẩu');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findByPk(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const otpDigits = normalizeOtpDigits(otp);
    if (otpDigits.length !== 6) {
        const err = new Error('Mã OTP phải gồm đúng 6 chữ số');
        err.statusCode = 400;
        throw err;
    }

    const keys = otpKeysForEmailInput(CHANGE_PASSWORD_OTP_PREFIX, user.email);
    const storedVals = await Promise.all(keys.map((k) => redisClient.get(k)));
    let otpValid = false;

    for (let i = 0; i < keys.length; i += 1) {
        const raw = storedVals[i];
        if (raw && normalizeOtpDigits(raw) === otpDigits) {
            otpValid = true;
            break;
        }
    }

    if (!otpValid) {
        const err = new Error('OTP không đúng hoặc đã hết hạn');
        err.statusCode = 400;
        throw err;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        const err = new Error('Mật khẩu hiện tại không chính xác');
        err.statusCode = 400;
        throw err;
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
        const err = new Error('Mật khẩu mới không được trùng với mật khẩu cũ');
        err.statusCode = 400;
        throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({ password: passwordHash });

    await redisClearOtp(CHANGE_PASSWORD_OTP_PREFIX, user.email);

    return { message: 'Đổi mật khẩu thành công.' };
};

module.exports = {
    requestEditProfileOtp,
    updateUserProfile,
    getUserPublicById,
    requestChangePasswordOtp,
    changePasswordWithOtp
};
