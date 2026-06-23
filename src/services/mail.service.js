const sendEmail = require('../utils/sendEmail');
const { buildActivationOtpEmail } = require('../utils/emailTemplates/activationOtp');
const { buildGenericOtpEmail } = require('../utils/emailTemplates/genericOtp');

/** Bật = chỉ in OTP ra console, không gửi SMTP (đặt OTP_DEV_CONSOLE=true trong .env). */
const devConsoleOtpEnabled = () => {
    if (process.env.OTP_DEV_CONSOLE !== 'true') return false;
    if (process.env.NODE_ENV === 'production') {
        console.warn(
            '[UTEShop] OTP_DEV_CONSOLE=true trong NODE_ENV=production — chỉ dùng khi bạn cố ý bỏ SMTP.'
        );
    }
    return true;
};

const sendGenericOtpEmail = async (email, otp, ttlSeconds, title, description) => {
    const ttlMinutes = Math.max(1, Math.round(ttlSeconds / 60));

    if (devConsoleOtpEnabled()) {
        console.log(
            `\n[UTEShop][OTP] Không gửi SMTP — OTP_DEV_CONSOLE=true\n` +
                `  Email: ${email}\n` +
                `  OTP:   ${otp}\n` +
                `  Loại:  ${title}\n` +
                `  TTL:   ~${ttlMinutes} phút (${ttlSeconds}s)\n`
        );
        return;
    }

    const { subject, text, html } = buildGenericOtpEmail(otp, ttlMinutes, title, description);

    await sendEmail({
        email,
        subject,
        message: text,
        html
    });
};

const sendActivationOtp = async (email, otp, ttlSeconds = 600) => {
    const ttlMinutes = Math.max(1, Math.round(ttlSeconds / 60));

    if (devConsoleOtpEnabled()) {
        console.log(
            '\n[UTEShop][OTP] Không gửi SMTP — OTP_DEV_CONSOLE=true\n' +
                `  Email: ${email}\n` +
                `  OTP:   ${otp}\n` +
                `  TTL:   ~${ttlMinutes} phút (${ttlSeconds}s)\n`
        );
        return;
    }

    const { subject, text, html } = buildActivationOtpEmail(otp, ttlMinutes);

    await sendEmail({
        email,
        subject,
        message: text,
        html
    });
};

const sendForgotPasswordOtp = (email, otp, ttlSeconds = 600) => {
    return sendGenericOtpEmail(
        email,
        otp,
        ttlSeconds,
        'Khôi phục mật khẩu',
        'Dưới đây là mã xác minh để đặt lại mật khẩu cho tài khoản của bạn.'
    );
};

const sendEditProfileOtp = (email, otp, ttlSeconds = 600) => {
    return sendGenericOtpEmail(
        email,
        otp,
        ttlSeconds,
        'Xác thực cập nhật thông tin',
        'Dưới đây là mã xác minh để xác nhận yêu cầu cập nhật thông tin cá nhân của bạn.'
    );
};

const sendChangePasswordOtp = (email, otp, ttlSeconds = 600) => {
    return sendGenericOtpEmail(
        email,
        otp,
        ttlSeconds,
        'Xác thực đổi mật khẩu',
        'Dưới đây là mã xác minh để xác nhận yêu cầu thay đổi mật khẩu của bạn.'
    );
};

module.exports = {
    sendActivationOtp,
    sendForgotPasswordOtp,
    sendEditProfileOtp,
    sendChangePasswordOtp
};
