const { User, Category, Product, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const adminDashboardService = require('../services/adminDashboard.service');

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
 * List all users (admin-only)
 */
const listUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'status', 'createdAt']
        });
        return successResponse(res, 200, 'Danh sách người dùng', { users });
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

module.exports = {
    listUsers,
    getDashboard,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkActiveCategories,
    bulkDeleteCategories
};
