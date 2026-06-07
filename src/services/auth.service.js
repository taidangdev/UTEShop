const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/user.model');
const Major = require('../models/major.model');
const redisClient = require('../config/redis');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenGenerator');
const { normalizeEmailForAuth } = require('../utils/normalizeEmail');
const { normalizeOtpDigits } = require('../utils/otpDigits');
const { otpKeysForEmailInput, REGISTER_OTP_PREFIX, FORGOT_OTP_PREFIX } = require('../utils/otpRedisKeys');
const { sendActivationOtp, sendForgotPasswordOtp } = require('./mail.service');

const OTP_TTL_SEC = Number(process.env.OTP_TTL_SECONDS) || 600;

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

/** Tìm user khi DB có thể lưu email chuẩn Gmail hoặc bản gõ tay cũ */
const findUserByEmailVariants = async (email) => {
    const canonical = normalizeEmailForAuth(email);
    const legacy = String(email || '').trim().toLowerCase();
    if (!canonical && !legacy) return null;
    if (canonical === legacy) {
        return User.findOne({ where: { email: canonical } });
    }
    return User.findOne({
        where: {
            [Op.or]: [{ email: canonical }, { email: legacy }]
        }
    });
};

const hashPassword = (plain) => bcrypt.hash(plain, 12);

const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const registerUser = async ({ username, email, password, fullName, studentId, majorId }) => {
    const normalizedEmail = normalizeEmailForAuth(email);

    const existing = await User.findOne({
        where: { email: normalizedEmail }
    });
    if (existing) {
        const err = new Error('Email already registered');
        err.statusCode = 409;
        throw err;
    }

    const nameTaken = await User.findOne({ where: { username: username.trim() } });
    if (nameTaken) {
        const err = new Error('Username already taken');
        err.statusCode = 409;
        throw err;
    }

    if (majorId) {
        const major = await Major.findByPk(majorId);
        if (!major || !major.isActive) {
            const err = new Error('Ngành học không hợp lệ');
            err.statusCode = 400;
            throw err;
        }
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
        username: username.trim(),
        email: normalizedEmail,
        password: passwordHash,
        fullName: fullName?.trim() || null,
        studentId: studentId?.trim() || null,
        majorId: majorId || null,
        role: 'customer',
        status: 'inactive'
    });

    const otp = generateOtp();
    await redisSetOtp(REGISTER_OTP_PREFIX, email, otp);

    try {
        await sendActivationOtp(normalizedEmail, otp, OTP_TTL_SEC);
    } catch (e) {
        await user.destroy();
        await redisClearOtp(REGISTER_OTP_PREFIX, email);
        console.error('[register] Gửi OTP thất bại:', e.message || e);

        const detail =
            process.env.NODE_ENV === 'development'
                ? e.message || String(e)
                : 'Could not send activation email. Try again later.';
        const err = new Error(detail);
        err.statusCode = 502;
        if (process.env.NODE_ENV === 'development' && e.code) {
            err.code = e.code;
        }
        throw err;
    }

    return {
        userId: user.id,
        email: user.email,
        message: 'Đăng ký thành công. Kiểm tra email để lấy mã OTP kích hoạt.'
    };
};

const verifyActivation = async ({ email, otp }) => {
    const otpDigits = normalizeOtpDigits(otp);

    if (otpDigits.length !== 6) {
        const err = new Error('Mã OTP phải gồm đúng 6 chữ số');
        err.statusCode = 400;
        throw err;
    }

    const keys = otpKeysForEmailInput(REGISTER_OTP_PREFIX, email);
    const storedVals = await Promise.all(keys.map((k) => redisClient.get(k)));
    let otpValid = false;
    let anyStored = false;

    for (let i = 0; i < keys.length; i += 1) {
        const raw = storedVals[i];
        if (raw == null) continue;
        anyStored = true;
        if (normalizeOtpDigits(raw) === otpDigits) {
            otpValid = true;
            break;
        }
    }

    if (!anyStored) {
        const maybeUser = await findUserByEmailVariants(email);
        const msg =
            maybeUser && maybeUser.status === 'inactive'
                ? 'OTP đã hết hạn hoặc không còn hiệu lực. Gọi POST /api/auth/resend-otp để lấy mã mới.'
                : 'Không tìm thấy OTP — kiểm tra email đã đăng ký đúng chưa, hoặc đăng ký lại.';
        const err = new Error(msg);
        err.statusCode = 400;
        throw err;
    }

    if (!otpValid) {
        const err = new Error(
            'Sai mã OTP. Nếu bạn vừa gửi lại OTP (resend), chỉ mã mới nhất có hiệu lực — dùng đúng mã vừa nhận hoặc copy lại từ terminal (OTP_DEV_CONSOLE).'
        );
        err.statusCode = 400;
        throw err;
    }

    const user = await findUserByEmailVariants(email);
    if (!user) {
        const err = new Error('Không tìm thấy tài khoản');
        err.statusCode = 404;
        throw err;
    }

    if (user.status === 'active') {
        await redisClearOtp(REGISTER_OTP_PREFIX, email);
        const err = new Error('Tài khoản đã được kích hoạt');
        err.statusCode = 400;
        throw err;
    }

    await user.update({ status: 'active' });
    await redisClearOtp(REGISTER_OTP_PREFIX, email);

    return { message: 'Kích hoạt tài khoản thành công. Bạn có thể đăng nhập.' };
};

const resendActivationOtp = async ({ email }) => {
    const user = await findUserByEmailVariants(email);

    if (!user) {
        const err = new Error('Không tìm thấy tài khoản với email này');
        err.statusCode = 404;
        throw err;
    }

    if (user.status === 'active') {
        const err = new Error('Tài khoản đã được kích hoạt');
        err.statusCode = 400;
        throw err;
    }

    const otp = generateOtp();
    await redisSetOtp(REGISTER_OTP_PREFIX, email, otp);
    await sendActivationOtp(user.email, otp, OTP_TTL_SEC);

    return { message: 'Đã gửi lại mã OTP. Kiểm tra email.' };
};

const loginUser = async ({ email, password }) => {
    const user = await findUserByEmailVariants(email);

    if (!user) {
        const err = new Error('Email hoặc mật khẩu không đúng');
        err.statusCode = 401;
        throw err;
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
        const err = new Error('Email hoặc mật khẩu không đúng');
        err.statusCode = 401;
        throw err;
    }

    if (user.status === 'inactive') {
        const err = new Error('Tài khoản chưa kích hoạt. Kiểm tra email OTP.');
        err.statusCode = 403;
        err.code = 'ACCOUNT_INACTIVE';
        throw err;
    }

    if (user.status === 'banned') {
        const err = new Error('Tài khoản đã bị khóa');
        err.statusCode = 403;
        throw err;
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ sub: user.id });
    
    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/profile';

    return {
        accessToken,
        refreshToken,
        redirectUrl,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        }
    };
};

const forgotPassword = async (email) => {
    const user = await findUserByEmailVariants(email);
    if (!user) {
        // Tránh lộ lọt email, luôn báo thành công
        return { message: 'Nếu email tồn tại, OTP đã được gửi đến bạn.' };
    }

    if (user.status === 'banned') {
        const err = new Error('Tài khoản đã bị khóa');
        err.statusCode = 403;
        throw err;
    }

    const otp = generateOtp();
    await redisSetOtp(FORGOT_OTP_PREFIX, email, otp);
    await sendForgotPasswordOtp(user.email, otp, OTP_TTL_SEC);

    return { message: 'Nếu email tồn tại, OTP đã được gửi đến bạn.' };
};

const resetPassword = async ({ email, otp, newPassword }) => {
    const otpDigits = normalizeOtpDigits(otp);

    const keys = otpKeysForEmailInput(FORGOT_OTP_PREFIX, email);
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

    const user = await findUserByEmailVariants(email);
    if (!user) {
        const err = new Error('Không tìm thấy tài khoản');
        err.statusCode = 404;
        throw err;
    }

    const passwordHash = await hashPassword(newPassword);
    await user.update({ password: passwordHash });
    await redisClearOtp(FORGOT_OTP_PREFIX, email);

    return { message: 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' };
};

const refreshSession = async (refreshToken) => {
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
        const err = new Error('Refresh token không hợp lệ hoặc đã hết hạn');
        err.statusCode = 401;
        throw err;
    }

    const user = await User.findByPk(decoded.sub);
    if (!user || user.status !== 'active') {
        const err = new Error('Không thể làm mới phiên đăng nhập');
        err.statusCode = 401;
        throw err;
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken({ sub: user.id });

    return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        }
    };
};

module.exports = {
    registerUser,
    verifyActivation,
    resendActivationOtp,
    loginUser,
    refreshSession,
    forgotPassword,
    resetPassword
};
