/**
 * Maps each role to allowed permission keys.
 * Admin is handled in middleware as full access (see requirePermission).
 */
const CUSTOMER_PERMISSIONS = [
    'profile:read',
    'profile:update',
    'orders:read',
    'orders:create',
    'cart:manage',
    'reviews:create',
    'consignments:read',
    'consignments:write'
];

const PERMISSIONS_BY_ROLE = {
    customer: CUSTOMER_PERMISSIONS,
    user: CUSTOMER_PERMISSIONS,
    admin: [
        'profile:read',
        'profile:update',
        'users:list',
        'users:manage',
        'admin:access'
    ]
};

module.exports = { PERMISSIONS_BY_ROLE };
