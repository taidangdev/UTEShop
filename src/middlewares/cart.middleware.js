const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const cartService = require('../services/cart.service');

const CART_SESSION_COOKIE = 'uteshop_cart_session';

/**
 * Optional JWT: sets req.user when Bearer token is valid; does not fail when missing.
 */
const optionalVerifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findByPk(decoded.sub);

        if (user && user.status === 'active') {
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
            };
        }
    } catch {
        // Ignore invalid guest tokens
    }
    next();
};

/**
 * Resolves cart ownership: logged-in user cart or guest session cookie/header.
 */
const resolveCartContext = (req, res, next) => {
    if (req.user?.id) {
        const sessionId = req.cookies?.[CART_SESSION_COOKIE] || req.headers['x-cart-session'] || null;
        req.cartContext = { userId: req.user.id, sessionId };
        return next();
    }

    let sessionId = req.cookies?.[CART_SESSION_COOKIE] || req.headers['x-cart-session'];
    if (!sessionId) {
        sessionId = cartService.createCartSessionId();
        res.cookie(CART_SESSION_COOKIE, sessionId, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
    }

    req.cartContext = { userId: null, sessionId };
    next();
};

module.exports = {
    optionalVerifyToken,
    resolveCartContext,
    CART_SESSION_COOKIE
};
