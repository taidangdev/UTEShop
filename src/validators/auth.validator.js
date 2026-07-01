const { body } = require('express-validator');

const registerValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username là bắt buộc')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username từ 3 đến 50 ký tự'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .custom((value) => {
            if (!value.toLowerCase().endsWith('@student.hcmute.edu.vn')) {
                throw new Error('Email phải là email sinh viên HCMUTE (đuôi @student.hcmute.edu.vn)');
            }
            return true;
        })
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Mật khẩu là bắt buộc')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu ít nhất 8 ký tự')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Mật khẩu phải có ít nhất một chữ cái và một chữ số'),
    body('fullName')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 150 })
        .withMessage('Họ tên tối đa 150 ký tự'),
    body('studentId')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 20 })
        .withMessage('MSSV tối đa 20 ký tự'),
    body('majorId')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage('Ngành không hợp lệ')
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
];

const verifyEmailValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('otp')
        .trim()
        .customSanitizer((v) =>
            String(v ?? '')
                .normalize('NFKC')
                .replace(/\D/g, '')
        )
        .notEmpty()
        .withMessage('OTP là bắt buộc')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP phải có đúng 6 chữ số')
        .matches(/^\d{6}$/)
        .withMessage('OTP chỉ gồm chữ số')
];

const resendOtpValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail()
];

const refreshTokenValidation = [
    body('refreshToken').notEmpty().withMessage('refreshToken là bắt buộc')
];

const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail()
];

const resetPasswordValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email là bắt buộc')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('otp')
        .trim()
        .customSanitizer((v) =>
            String(v ?? '')
                .normalize('NFKC')
                .replace(/\D/g, '')
        )
        .notEmpty()
        .withMessage('OTP là bắt buộc')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP phải có đúng 6 chữ số')
        .matches(/^\d{6}$/)
        .withMessage('OTP chỉ gồm chữ số'),
    body('newPassword')
        .notEmpty()
        .withMessage('Mật khẩu mới là bắt buộc')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu ít nhất 8 ký tự')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Mật khẩu phải có ít nhất một chữ cái và một chữ số')
];

module.exports = {
    registerValidation,
    loginValidation,
    verifyEmailValidation,
    resendOtpValidation,
    refreshTokenValidation,
    forgotPasswordValidation,
    resetPasswordValidation
};
