require('dotenv').config();

const { sequelize, syncDatabase } = require('../models');
const { seedMajors } = require('./seedMajors');
const { seedCategories } = require('./seedCategories');
const { seedProducts } = require('./seedProducts');
const { seedBanners } = require('./seedBanners');
const { seedPromotions } = require('./seedPromotions');
const { seedUsers } = require('./seedUsers');
const { seedOrders } = require('./seedOrders');
const { seedReviews } = require('./seedReviews');

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection OK.');

        const { ensureUserColumns, ensureSchema } = require('../utils/ensureSchema');

        console.log('Applying schema patches...');
        await ensureSchema(sequelize);

        console.log('Syncing all tables...');
        await syncDatabase({ alter: false });

        console.log('Cleaning up existing database tables...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const modelName of Object.keys(sequelize.models)) {
            const model = sequelize.models[modelName];
            try {
                await model.truncate({ cascade: true, restartIdentity: true });
            } catch (err) {
                await model.destroy({ where: {}, force: true });
            }
        }
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database cleanup completed.');

        console.log('Seeding majors...');
        const majorCodeToId = await seedMajors();

        console.log('Seeding categories...');
        const categorySlugToId = await seedCategories();

        console.log('Seeding products...');
        await seedProducts(categorySlugToId, majorCodeToId);

        console.log('Seeding banners...');
        await seedBanners();

        console.log('Seeding promotions...');
        await seedPromotions(categorySlugToId);

        console.log('Seeding users...');
        await seedUsers();

        console.log('Seeding orders...');
        await seedOrders();

        console.log('Seeding product reviews...');
        await seedReviews();

        console.log('Done.');
    } catch (err) {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
};

run();
