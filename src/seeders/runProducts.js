const { sequelize } = require('../models');
const { seedProducts } = require('./seedProducts');
const { seedCategories } = require('./seedCategories');
const { seedMajors } = require('./seedMajors');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        const categories = await seedCategories();
        const majors = await seedMajors();
        await seedProducts(categories, majors);
        console.log('Products seeded successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
