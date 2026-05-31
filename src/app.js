const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('./middlewares/error.middleware');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const catalogRoutes = require('./routes/catalog.routes');
const cartRoutes = require('./routes/cart.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const reviewRoutes = require('./routes/review.routes');

const app = express();

// --- BƯỚC 1: CÁC MIDDLEWARE CƠ BẢN ---
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(
    cors({
        origin: frontendOrigin,
        credentials: true
    })
);

// Parse JSON body
app.use(express.json());

// Parse urlencoded
app.use(express.urlencoded({ extended: true }));

// Parse Cookie
app.use(cookieParser());

// --- BƯỚC 2: KHAI BÁO CÁC ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/reviews', reviewRoutes);

// Xử lý Route không tồn tại
app.all('*', (req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server`);
    err.statusCode = 404;
    next(err);
});

// --- BƯỚC 3: MIDDLEWARE XỬ LÝ LỖI (ERROR HANDLER) ---
// Middleware này phải nằm ở cuối cùng
app.use(errorHandler);

module.exports = app;
