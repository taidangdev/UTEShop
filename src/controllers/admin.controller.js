const { User, Category, Product, Promotion, PromotionCategory, PromotionProduct, Major, Address, Order, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const adminDashboardService = require('../services/adminDashboard.service');
const adminOrderService = require('../services/adminOrder.service');
const adminProductService = require('../services/adminProduct.service');
const adminConsignmentService = require('../services/adminConsignment.service');

/**
 * Vietnamese friendly slug generation
 */
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

/**
 * Traces parent chain upwards to check if parentCandidateId is a descendant of categoryId
 */
const isDescendant = async (parentCandidateId, categoryId) => {
    if (parentCandidateId === categoryId) {
        return true;
    }
    let current = await Category.findByPk(parentCandidateId);
    while (current) {
        if (current.parentId === categoryId) {
            return true;
        }
        if (!current.parentId) {
            break;
        }
        current = await Category.findByPk(current.parentId);
    }
    return false;
};

/**
 * List all users with pagination, search, and filters (admin-only)
 */
const listUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const { q, role, status } = req.query;

        const where = {};
        if (role) where.role = role;
        if (status) where.status = status;

        if (q && q.trim()) {
            const { Op } = require('sequelize');
            const like = `%${q.trim()}%`;
            where[Op.or] = [
                { username: { [Op.like]: like } },
                { email: { [Op.like]: like } },
                { fullName: { [Op.like]: like } },
                { phone: { [Op.like]: like } },
                { studentId: { [Op.like]: like } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['id', 'username', 'email', 'fullName', 'phone', 'address', 'role', 'status', 'studentId', 'loyaltyPoints', 'createdAt'],
            include: [
                {
                    model: Major,
                    as: 'major',
                    attributes: ['id', 'code', 'name']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        const userIds = rows.map((u) => u.id);
        const orderCountMap = {};
        if (userIds.length > 0) {
            const orderCounts = await Order.findAll({
                attributes: ['userId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                where: { userId: userIds },
                group: ['userId']
            });
            orderCounts.forEach((oc) => {
                orderCountMap[oc.userId] = parseInt(oc.get('count'), 10) || 0;
            });
        }

        const mappedUsers = rows.map((u) => {
            const json = u.toJSON();
            return {
                ...json,
                orderCount: orderCountMap[u.id] || 0
            };
        });

        return successResponse(res, 200, 'Danh sách người dùng', {
            users: mappedUsers,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get detailed customer profile, including addresses and recent orders (admin-only)
 */
const getUserDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Major,
                    as: 'major',
                    attributes: ['id', 'code', 'name']
                },
                {
                    model: Address,
                    as: 'addresses'
                }
            ]
        });

        if (!user) {
            return errorResponse(res, 404, 'Người dùng không tồn tại');
        }

        // Fetch top 10 recent orders
        const orders = await Order.findAll({
            where: { userId: id },
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        return successResponse(res, 200, 'Chi tiết người dùng', { user, orders });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user status and ban active socket sessions if banned (admin-only)
 */
const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive', 'banned'].includes(status)) {
            return errorResponse(res, 400, 'Trạng thái không hợp lệ');
        }

        const user = await User.findByPk(id);
        if (!user) {
            return errorResponse(res, 404, 'Người dùng không tồn tại');
        }

        if (user.role === 'admin' && status === 'banned') {
            return errorResponse(res, 400, 'Không thể khóa tài khoản Admin');
        }

        await user.update({ status });

        // If banned, disconnect any active socket connections
        if (status === 'banned') {
            const socketService = require('../services/socket.service');
            socketService.disconnectUser(user.id);
        }

        return successResponse(res, 200, 'Cập nhật trạng thái người dùng thành công', { user });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user role (admin-only, prevent self-role modification)
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['admin', 'customer'].includes(role)) {
            return errorResponse(res, 400, 'Vai trò không hợp lệ');
        }

        const user = await User.findByPk(id);
        if (!user) {
            return errorResponse(res, 404, 'Người dùng không tồn tại');
        }

        if (req.user.id === user.id) {
            return errorResponse(res, 400, 'Bạn không thể tự thay đổi quyền hạn của chính mình');
        }

        await user.update({ role });
        return successResponse(res, 200, 'Cập nhật vai trò người dùng thành công', { user });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk updates user statuses and disconnects sockets for banned users (admin-only)
 */
const bulkUpdateUserStatus = async (req, res, next) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return errorResponse(res, 400, 'Danh sách ID không hợp lệ');
        }
        if (!['active', 'inactive', 'banned'].includes(status)) {
            return errorResponse(res, 400, 'Trạng thái không hợp lệ');
        }

        const users = await User.findAll({ where: { id: ids } });
        const safeIds = [];
        const failedNames = [];

        users.forEach((u) => {
            if (u.role === 'admin' && status === 'banned') {
                failedNames.push(u.username);
            } else {
                safeIds.push(u.id);
            }
        });

        if (safeIds.length > 0) {
            await User.update({ status }, { where: { id: safeIds } });

            // If banning, disconnect sockets for all safeIds
            if (status === 'banned') {
                const socketService = require('../services/socket.service');
                safeIds.forEach((userId) => {
                    socketService.disconnectUser(userId);
                });
            }
        }

        return successResponse(res, 200, 'Cập nhật trạng thái hàng loạt thành công', {
            updatedCount: safeIds.length,
            failedNames
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch dashboard statistics (admin-only)
 */
const getDashboard = async (req, res, next) => {
    try {
        const data = await adminDashboardService.getAdminDashboardStats({
            from: req.query.from,
            to: req.query.to,
            preset: req.query.preset,
            groupBy: req.query.groupBy,
            status: req.query.status
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

/**
 * List all categories with product and child counts (admin-only)
 */
const listCategories = async (req, res, next) => {
    try {
        const categories = await Category.findAll({
            order: [
                ['sortOrder', 'ASC'],
                ['name', 'ASC']
            ]
        });

        // Count products directly linked to each category
        const productCounts = await Product.findAll({
            attributes: ['categoryId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['categoryId']
        });

        const countMap = {};
        productCounts.forEach((pc) => {
            countMap[pc.categoryId] = parseInt(pc.get('count'), 10) || 0;
        });

        // Count subcategories directly under each category
        const subcategoryCountMap = {};
        categories.forEach((c) => {
            if (c.parentId) {
                subcategoryCountMap[c.parentId] = (subcategoryCountMap[c.parentId] || 0) + 1;
            }
        });

        const mapped = categories.map((c) => {
            const json = c.toJSON();
            return {
                ...json,
                productCount: countMap[c.id] || 0,
                childCount: subcategoryCountMap[c.id] || 0
            };
        });

        return successResponse(res, 200, 'Danh sách danh mục', { categories: mapped });
    } catch (error) {
        next(error);
    }
};

const listOrders = async (req, res, next) => {
    try {
        const status = req.query.status === 'all' ? undefined : req.query.status;
        const data = await adminOrderService.listOrders({
            page: req.query.page,
            limit: req.query.limit,
            status,
            search: req.query.search,
            from: req.query.from,
            to: req.query.to
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new category (admin-only)
 */
const createCategory = async (req, res, next) => {
    try {
        const { name, parentId, slug, description, icon, sortOrder, isActive } = req.body;

        if (!name || !name.trim()) {
            return errorResponse(res, 400, 'Tên danh mục là bắt buộc');
        }

        let finalSlug = slug ? slugify(slug) : slugify(name);

        // Ensure unique slug
        const existing = await Category.findOne({ where: { slug: finalSlug } });
        if (existing) {
            finalSlug = `${finalSlug}-${Date.now()}`;
        }

        if (parentId) {
            const parent = await Category.findByPk(parentId);
            if (!parent) {
                return errorResponse(res, 400, 'Danh mục cha không tồn tại');
            }
        }

        const category = await Category.create({
            name: name.trim(),
            parentId: parentId || null,
            slug: finalSlug,
            description: description || null,
            icon: icon || null,
            sortOrder: parseInt(sortOrder, 10) || 0,
            isActive: isActive !== false
        });

        return successResponse(res, 201, 'Tạo danh mục thành công', { category });
    } catch (error) {
        next(error);
    }
};

const getOrderDetail = async (req, res, next) => {
    try {
        const data = await adminOrderService.getOrderDetail(req.params.orderNumber);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

/**
 * Update an existing category with circular reference check (admin-only)
 */
const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, parentId, slug, description, icon, sortOrder, isActive } = req.body;

        const category = await Category.findByPk(id);
        if (!category) {
            return errorResponse(res, 404, 'Danh mục không tồn tại');
        }

        if (name !== undefined && (!name || !name.trim())) {
            return errorResponse(res, 400, 'Tên danh mục không được để trống');
        }

        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description || null;
        if (icon !== undefined) updates.icon = icon || null;
        if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10) || 0;
        if (isActive !== undefined) updates.isActive = !!isActive;

        if (slug !== undefined && slug !== category.slug) {
            let finalSlug = slugify(slug);
            const existing = await Category.findOne({ where: { slug: finalSlug } });
            if (existing && existing.id !== category.id) {
                finalSlug = `${finalSlug}-${Date.now()}`;
            }
            updates.slug = finalSlug;
        } else if (name !== undefined && slug === undefined) {
            let finalSlug = slugify(name);
            const existing = await Category.findOne({ where: { slug: finalSlug } });
            if (existing && existing.id !== category.id) {
                finalSlug = `${finalSlug}-${Date.now()}`;
            }
            updates.slug = finalSlug;
        }

        if (parentId !== undefined && parentId !== category.parentId) {
            if (parentId) {
                const parent = await Category.findByPk(parentId);
                if (!parent) {
                    return errorResponse(res, 400, 'Danh mục cha không tồn tại');
                }

                // Cyclic check
                const circular = await isDescendant(parentId, category.id);
                if (circular) {
                    return errorResponse(
                        res,
                        400,
                        'Không thể đặt danh mục cha là chính nó hoặc danh mục con của nó'
                    );
                }
                updates.parentId = parentId;
            } else {
                updates.parentId = null;
            }
        }

        await category.update(updates);
        return successResponse(res, 200, 'Cập nhật danh mục thành công', { category });
    } catch (error) {
        next(error);
    }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const data = await adminOrderService.updateOrderStatus(req.params.orderNumber, {
            status: req.body.status,
            adminNote: req.body.adminNote
        });
        return successResponse(res, 200, 'Order status updated', data);
    } catch (error) {
        next(error);
    }
};

const updateOrderNote = async (req, res, next) => {
    try {
        const data = await adminOrderService.updateOrderNote(req.params.orderNumber, {
            adminNote: req.body.adminNote
        });
        return successResponse(res, 200, 'Order admin note updated', data);
    } catch (error) {
        next(error);
    }
};

const listProducts = async (req, res, next) => {
    try {
        const status = req.query.status === 'all' ? undefined : req.query.status;
        const data = await adminProductService.listProducts({
            page: req.query.page,
            limit: req.query.limit,
            status,
            search: req.query.search,
            categoryId: req.query.categoryId
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getProductFormOptions = async (req, res, next) => {
    try {
        const data = await adminProductService.getFormOptions();
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getProductDetail = async (req, res, next) => {
    try {
        const data = await adminProductService.getProductById(req.params.id);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const createProduct = async (req, res, next) => {
    try {
        const data = await adminProductService.createProduct(req.body);
        return successResponse(res, 201, 'Product created', data);
    } catch (error) {
        next(error);
    }
};

const updateProduct = async (req, res, next) => {
    try {
        const data = await adminProductService.updateProduct(req.params.id, req.body);
        return successResponse(res, 200, 'Product updated', data);
    } catch (error) {
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        const data = await adminProductService.deleteProduct(req.params.id);
        return successResponse(res, 200, 'Product archived', data);
    } catch (error) {
        next(error);
    }
};

const listConsignments = async (req, res, next) => {
    try {
        const { page, limit, status, search } = req.query;
        const data = await adminConsignmentService.listConsignments({ page, limit, status, search });
        return successResponse(res, 200, 'Danh sách ký gửi', data);
    } catch (error) {
        next(error);
    }
};

const updateConsignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await adminConsignmentService.updateConsignment(Number(id), req.body);
        return successResponse(res, 200, 'Cập nhật yêu cầu ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

/**
 * Hard delete a category only if empty (admin-only)
 */
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const category = await Category.findByPk(id);
        if (!category) {
            return errorResponse(res, 404, 'Danh mục không tồn tại');
        }

        // Check for subcategories
        const hasChildren = await Category.findOne({ where: { parentId: id } });
        if (hasChildren) {
            return errorResponse(
                res,
                400,
                'Không thể xóa danh mục này vì nó đang chứa các danh mục con'
            );
        }

        // Check for products
        const hasProducts = await Product.findOne({ where: { categoryId: id } });
        if (hasProducts) {
            return errorResponse(
                res,
                400,
                'Không thể xóa danh mục này vì đang có sản phẩm liên kết'
            );
        }

        await category.destroy();
        return successResponse(res, 200, 'Xóa danh mục thành công');
    } catch (error) {
        next(error);
    }
};

const deleteConsignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await adminConsignmentService.deleteConsignment(Number(id));
        return successResponse(res, 200, data.message || 'Xóa ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk active/deactivate categories (admin-only)
 */
const bulkActiveCategories = async (req, res, next) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return errorResponse(res, 400, 'Danh sách ID danh mục không hợp lệ');
        }
        if (isActive === undefined) {
            return errorResponse(res, 400, 'Trạng thái hoạt động isActive là bắt buộc');
        }

        await Category.update(
            { isActive: !!isActive },
            { where: { id: ids } }
        );

        return successResponse(res, 200, 'Cập nhật trạng thái hàng loạt thành công');
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk delete categories with safety checks (admin-only)
 */
const bulkDeleteCategories = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return errorResponse(res, 400, 'Danh sách ID danh mục không hợp lệ');
        }

        const categories = await Category.findAll({ where: { id: ids } });
        const safeIds = [];
        const failedNames = [];

        for (const cat of categories) {
            const hasChildren = await Category.findOne({ where: { parentId: cat.id } });
            const hasProducts = await Product.findOne({ where: { categoryId: cat.id } });

            if (hasChildren || hasProducts) {
                failedNames.push(cat.name);
            } else {
                safeIds.push(cat.id);
            }
        }

        if (safeIds.length > 0) {
            await Category.destroy({ where: { id: safeIds } });
        }

        return successResponse(res, 200, 'Xóa hàng loạt hoàn tất', {
            deletedCount: safeIds.length,
            failedNames
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all promotions with pagination (admin-only)
 */
const listPromotions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Promotion.findAndCountAll({
            include: [
                {
                    model: Category,
                    as: 'categories',
                    attributes: ['id', 'name', 'slug'],
                    through: { attributes: [] }
                },
                {
                    model: Product,
                    as: 'products',
                    attributes: ['id', 'name', 'slug'],
                    through: { attributes: [] }
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        return successResponse(res, 200, 'Danh sách khuyến mãi', {
            promotions: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new promotion (admin-only)
 */
const createPromotion = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            code,
            name,
            scope,
            description,
            type,
            value,
            minOrderAmount,
            maxDiscountAmount,
            maxUsesPerUser,
            startsAt,
            endsAt,
            usageLimit,
            isActive,
            categoryIds,
            productIds
        } = req.body;

        if (!name || !name.trim()) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Tên khuyến mãi là bắt buộc');
        }

        if (!scope || !['shop', 'category', 'product'].includes(scope)) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Phạm vi áp dụng (scope) không hợp lệ');
        }

        if (!type || !['percentage', 'fixed_amount', 'free_shipping'].includes(type)) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Loại khuyến mãi (type) không hợp lệ');
        }

        // Validate values
        const finalValue = type === 'free_shipping' ? 0 : Number(value);
        if (type !== 'free_shipping' && (isNaN(finalValue) || finalValue <= 0)) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Giá trị khuyến mãi phải lớn hơn 0');
        }

        if (type === 'percentage' && finalValue > 100) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Phần trăm giảm giá không được vượt quá 100%');
        }

        let finalCode = code && code.trim() ? code.trim().toUpperCase() : null;
        if (!finalCode) {
            // Auto generate unique code
            finalCode = `PROMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            let isUnique = false;
            while (!isUnique) {
                const existing = await Promotion.findOne({ where: { code: finalCode }, transaction });
                if (!existing) {
                    isUnique = true;
                } else {
                    finalCode = `PROMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                }
            }
        } else {
            const existing = await Promotion.findOne({ where: { code: finalCode }, transaction });
            if (existing) {
                await transaction.rollback();
                return errorResponse(res, 400, 'Mã khuyến mãi đã tồn tại');
            }
        }

        // Validate maxDiscountAmount for percentage
        let finalMaxDiscount = null;
        if (type === 'percentage' && maxDiscountAmount != null) {
            finalMaxDiscount = Number(maxDiscountAmount);
            if (isNaN(finalMaxDiscount) || finalMaxDiscount < 0) {
                await transaction.rollback();
                return errorResponse(res, 400, 'Số tiền giảm tối đa không hợp lệ');
            }
        }

        let legacyCategoryId = null;
        if (scope === 'category' && Array.isArray(categoryIds) && categoryIds.length > 0) {
            legacyCategoryId = categoryIds[0];
        }

        const promotion = await Promotion.create({
            code: finalCode,
            name: name.trim(),
            scope,
            description: description || null,
            type,
            value: finalValue,
            minOrderAmount: minOrderAmount != null ? Number(minOrderAmount) : null,
            maxDiscountAmount: finalMaxDiscount,
            maxUsesPerUser: maxUsesPerUser != null ? parseInt(maxUsesPerUser, 10) : null,
            startsAt: startsAt ? new Date(startsAt) : null,
            endsAt: endsAt ? new Date(endsAt) : null,
            usageLimit: usageLimit != null ? parseInt(usageLimit, 10) : null,
            isActive: isActive !== false,
            categoryId: legacyCategoryId
        }, { transaction });

        if (scope === 'category' && Array.isArray(categoryIds) && categoryIds.length > 0) {
            const mappings = categoryIds.map(catId => ({
                promotionId: promotion.id,
                categoryId: catId
            }));
            await PromotionCategory.bulkCreate(mappings, { transaction });
        } else if (scope === 'product' && Array.isArray(productIds) && productIds.length > 0) {
            const mappings = productIds.map(prodId => ({
                promotionId: promotion.id,
                productId: prodId
            }));
            await PromotionProduct.bulkCreate(mappings, { transaction });
        }

        await transaction.commit();

        const reloaded = await Promotion.findByPk(promotion.id, {
            include: [
                { model: Category, as: 'categories', attributes: ['id', 'name', 'slug'], through: { attributes: [] } },
                { model: Product, as: 'products', attributes: ['id', 'name', 'slug'], through: { attributes: [] } }
            ]
        });

        return successResponse(res, 201, 'Tạo khuyến mãi thành công', { promotion: reloaded });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Update an existing promotion (admin-only)
 */
const updatePromotion = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            code,
            name,
            scope,
            description,
            type,
            value,
            minOrderAmount,
            maxDiscountAmount,
            maxUsesPerUser,
            startsAt,
            endsAt,
            usageLimit,
            isActive,
            categoryIds,
            productIds
        } = req.body;

        const promotion = await Promotion.findByPk(id, { transaction });
        if (!promotion) {
            await transaction.rollback();
            return errorResponse(res, 404, 'Khuyến mãi không tồn tại');
        }

        if (name !== undefined && (!name || !name.trim())) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Tên khuyến mãi không được để trống');
        }

        const isRedeemed = promotion.usedCount > 0;
        if (isRedeemed) {
            // Lock core fields
            if (code !== undefined && code.trim().toUpperCase() !== promotion.code) {
                await transaction.rollback();
                return errorResponse(res, 400, 'Không thể thay đổi mã khuyến mãi khi đã có người sử dụng');
            }
            if (scope !== undefined && scope !== promotion.scope) {
                await transaction.rollback();
                return errorResponse(res, 400, 'Không thể thay đổi phạm vi áp dụng khi đã có người sử dụng');
            }
            if (type !== undefined && type !== promotion.type) {
                await transaction.rollback();
                return errorResponse(res, 400, 'Không thể thay đổi loại khuyến mãi khi đã có người sử dụng');
            }
            if (value !== undefined && Number(value) !== Number(promotion.value)) {
                await transaction.rollback();
                return errorResponse(res, 400, 'Không thể thay đổi giá trị khi đã có người sử dụng');
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description || null;
        if (minOrderAmount !== undefined) updates.minOrderAmount = minOrderAmount != null ? Number(minOrderAmount) : null;
        if (maxUsesPerUser !== undefined) updates.maxUsesPerUser = maxUsesPerUser != null ? parseInt(maxUsesPerUser, 10) : null;
        if (startsAt !== undefined) updates.startsAt = startsAt ? new Date(startsAt) : null;
        if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;
        if (usageLimit !== undefined) updates.usageLimit = usageLimit != null ? parseInt(usageLimit, 10) : null;
        if (isActive !== undefined) updates.isActive = !!isActive;

        if (!isRedeemed) {
            if (code !== undefined) {
                const finalCode = code.trim().toUpperCase();
                if (!finalCode) {
                    await transaction.rollback();
                    return errorResponse(res, 400, 'Mã khuyến mãi không được để trống');
                }
                if (finalCode !== promotion.code) {
                    const existing = await Promotion.findOne({ where: { code: finalCode }, transaction });
                    if (existing) {
                        await transaction.rollback();
                        return errorResponse(res, 400, 'Mã khuyến mãi mới đã tồn tại');
                    }
                    updates.code = finalCode;
                }
            }

            if (scope !== undefined) {
                if (!['shop', 'category', 'product'].includes(scope)) {
                    await transaction.rollback();
                    return errorResponse(res, 400, 'Phạm vi không hợp lệ');
                }
                updates.scope = scope;
            }

            if (type !== undefined) {
                if (!['percentage', 'fixed_amount', 'free_shipping'].includes(type)) {
                    await transaction.rollback();
                    return errorResponse(res, 400, 'Loại khuyến mãi không hợp lệ');
                }
                updates.type = type;
            }

            if (value !== undefined) {
                const finalType = type || promotion.type;
                const finalVal = finalType === 'free_shipping' ? 0 : Number(value);
                if (finalType !== 'free_shipping' && (isNaN(finalVal) || finalVal <= 0)) {
                    await transaction.rollback();
                    return errorResponse(res, 400, 'Giá trị khuyến mãi phải lớn hơn 0');
                }
                if (finalType === 'percentage' && finalVal > 100) {
                    await transaction.rollback();
                    return errorResponse(res, 400, 'Phần trăm giảm giá không được vượt quá 100%');
                }
                updates.value = finalVal;
            }
        }

        // Handle maxDiscountAmount updates for percentage type
        const finalType = updates.type || promotion.type;
        if (finalType === 'percentage') {
            if (maxDiscountAmount !== undefined) {
                updates.maxDiscountAmount = maxDiscountAmount != null ? Number(maxDiscountAmount) : null;
                if (updates.maxDiscountAmount != null && (isNaN(updates.maxDiscountAmount) || updates.maxDiscountAmount < 0)) {
                    await transaction.rollback();
                    return errorResponse(res, 400, 'Số tiền giảm tối đa không hợp lệ');
                }
            }
        } else {
            updates.maxDiscountAmount = null;
        }

        // Sync relationships if not redeemed
        const finalScope = updates.scope || promotion.scope;
        let legacyCategoryId = promotion.categoryId;

        if (!isRedeemed) {
            await PromotionCategory.destroy({ where: { promotionId: id }, transaction });
            await PromotionProduct.destroy({ where: { promotionId: id }, transaction });

            if (finalScope === 'category' && Array.isArray(categoryIds)) {
                legacyCategoryId = categoryIds[0] || null;
                if (categoryIds.length > 0) {
                    const mappings = categoryIds.map(catId => ({
                        promotionId: id,
                        categoryId: catId
                    }));
                    await PromotionCategory.bulkCreate(mappings, { transaction });
                }
            } else if (finalScope === 'product' && Array.isArray(productIds)) {
                legacyCategoryId = null;
                if (productIds.length > 0) {
                    const mappings = productIds.map(prodId => ({
                        promotionId: id,
                        productId: prodId
                    }));
                    await PromotionProduct.bulkCreate(mappings, { transaction });
                }
            } else {
                legacyCategoryId = null;
            }
        }
        updates.categoryId = legacyCategoryId;

        await promotion.update(updates, { transaction });
        await transaction.commit();

        const reloaded = await Promotion.findByPk(id, {
            include: [
                { model: Category, as: 'categories', attributes: ['id', 'name', 'slug'], through: { attributes: [] } },
                { model: Product, as: 'products', attributes: ['id', 'name', 'slug'], through: { attributes: [] } }
            ]
        });

        return successResponse(res, 200, 'Cập nhật khuyến mãi thành công', { promotion: reloaded });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Delete an existing promotion (admin-only)
 */
const deletePromotion = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const promotion = await Promotion.findByPk(id, { transaction });
        if (!promotion) {
            await transaction.rollback();
            return errorResponse(res, 404, 'Khuyến mãi không tồn tại');
        }

        if (promotion.usedCount > 0) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Không thể xóa khuyến mãi này vì đã được áp dụng trong đơn hàng');
        }

        await PromotionCategory.destroy({ where: { promotionId: id }, transaction });
        await PromotionProduct.destroy({ where: { promotionId: id }, transaction });
        await promotion.destroy({ transaction });

        await transaction.commit();
        return successResponse(res, 200, 'Xóa khuyến mãi thành công');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

/**
 * Bulk toggle active status for promotions (admin-only)
 */
const bulkActivePromotions = async (req, res, next) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return errorResponse(res, 400, 'Danh sách ID khuyến mãi không hợp lệ');
        }
        if (isActive === undefined) {
            return errorResponse(res, 400, 'Trạng thái hoạt động isActive là bắt buộc');
        }

        await Promotion.update(
            { isActive: !!isActive },
            { where: { id: ids } }
        );

        return successResponse(res, 200, 'Cập nhật trạng thái khuyến mãi hàng loạt thành công');
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk delete promotions with safety checks (admin-only)
 */
const bulkDeletePromotions = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            await transaction.rollback();
            return errorResponse(res, 400, 'Danh sách ID khuyến mãi không hợp lệ');
        }

        const promotions = await Promotion.findAll({ where: { id: ids }, transaction });
        const safeIds = [];
        const failedCodes = [];

        for (const promo of promotions) {
            if (promo.usedCount > 0) {
                failedCodes.push(promo.code);
            } else {
                safeIds.push(promo.id);
            }
        }

        if (safeIds.length > 0) {
            await PromotionCategory.destroy({ where: { promotionId: safeIds }, transaction });
            await PromotionProduct.destroy({ where: { promotionId: safeIds }, transaction });
            await Promotion.destroy({ where: { id: safeIds }, transaction });
        }

        await transaction.commit();

        return successResponse(res, 200, 'Xóa khuyến mãi hàng loạt hoàn tất', {
            deletedCount: safeIds.length,
            failedCodes
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

module.exports = {
    listUsers,
    getDashboard,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkActiveCategories,
    bulkDeleteCategories,
    listPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    bulkActivePromotions,
    bulkDeletePromotions,
    getUserDetail,
    updateUserStatus,
    updateUserRole,
    bulkUpdateUserStatus,
    listOrders,
    getOrderDetail,
    updateOrderStatus,
    updateOrderNote,
    listProducts,
    getProductFormOptions,
    getProductDetail,
    createProduct,
    updateProduct,
    deleteProduct,
    listConsignments,
    updateConsignment,
    deleteConsignment
};
