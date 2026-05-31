const sequelize = require('../config/db');

const User = require('./user.model');
const Major = require('./major.model');
const Category = require('./category.model');
const Product = require('./product.model');
const ProductImage = require('./productImage.model');
const ProductMajor = require('./productMajor.model');
const ProductVariant = require('./productVariant.model');
const Address = require('./address.model');
const Cart = require('./cart.model');
const CartItem = require('./cartItem.model');
const Order = require('./order.model');
const OrderItem = require('./orderItem.model');
const Payment = require('./payment.model');
const Consignment = require('./consignment.model');
const ConsignmentImage = require('./consignmentImage.model');
const Promotion = require('./promotion.model');
const Banner = require('./banner.model');
const ProductReview = require('./productReview.model');
const PointTransaction = require('./pointTransaction.model');
const UserCoupon = require('./userCoupon.model');
const Wishlist = require('./wishlist.model');

// --- User & Major ---
User.belongsTo(Major, { foreignKey: 'majorId', as: 'major' });
Major.hasMany(User, { foreignKey: 'majorId', as: 'users' });

// --- Category (self-reference) ---
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });

// --- Product ---
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Product, { foreignKey: 'sellerId', as: 'listedProducts' });
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Product.belongsToMany(Major, {
    through: ProductMajor,
    foreignKey: 'productId',
    otherKey: 'majorId',
    as: 'majors'
});
Major.belongsToMany(Product, {
    through: ProductMajor,
    foreignKey: 'majorId',
    otherKey: 'productId',
    as: 'products'
});

// --- Address ---
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Cart ---
User.hasMany(Cart, { foreignKey: 'userId', as: 'carts' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
CartItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });

// --- Order ---
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.belongsTo(Address, { foreignKey: 'shippingAddressId', as: 'shippingAddress' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });

Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// --- Consignment ---
User.hasMany(Consignment, { foreignKey: 'userId', as: 'consignments' });
Consignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Consignment.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Consignment.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Consignment.hasMany(ConsignmentImage, { foreignKey: 'consignmentId', as: 'images' });
ConsignmentImage.belongsTo(Consignment, { foreignKey: 'consignmentId', as: 'consignment' });

// --- Promotion ---
Promotion.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// --- Reviews & Wishlist ---
Product.hasMany(ProductReview, { foreignKey: 'productId', as: 'reviews' });
ProductReview.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductReview.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ProductReview.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
ProductReview.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
OrderItem.hasOne(ProductReview, { foreignKey: 'orderItemId', as: 'review' });

User.hasMany(PointTransaction, { foreignKey: 'userId', as: 'pointTransactions' });
PointTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserCoupon, { foreignKey: 'userId', as: 'coupons' });
UserCoupon.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserCoupon.belongsTo(ProductReview, { foreignKey: 'reviewId', as: 'review' });

User.belongsToMany(Product, {
    through: Wishlist,
    foreignKey: 'userId',
    otherKey: 'productId',
    as: 'wishlistProducts'
});
Product.belongsToMany(User, {
    through: Wishlist,
    foreignKey: 'productId',
    otherKey: 'userId',
    as: 'wishlistedBy'
});

/** Use alter: false to avoid MySQL duplicate-index issues on existing tables. */
const syncDatabase = async (options = { alter: false }) => {
    await sequelize.sync(options);
};

module.exports = {
    sequelize,
    syncDatabase,
    User,
    Major,
    Category,
    Product,
    ProductImage,
    ProductMajor,
    ProductVariant,
    Address,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
    Consignment,
    ConsignmentImage,
    Promotion,
    Banner,
    ProductReview,
    PointTransaction,
    UserCoupon,
    Wishlist
};
