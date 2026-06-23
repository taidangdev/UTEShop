const rateLimit = require("express-rate-limit");

const authRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: "error", message: "Quá nhiều lần đăng ký. Thử lại sau." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: "error",
    message: "Quá nhiều lần đăng nhập. Thử lại sau.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    status: "error",
    message: "Quá nhiều lần xác thực OTP. Thử lại sau.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    status: "error",
    message: "Quá nhiều lần gửi lại OTP. Thử lại sau.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: "error", message: "Quá nhiều lần làm mới token." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authRegisterLimiter,
  authLoginLimiter,
  authVerifyLimiter,
  authResendLimiter,
  authRefreshLimiter,
};
