const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'products.json');
const products = require(jsonPath);

const categories = [
    'merchandise-uniform',
    'study-electronics',
    'life-dorm',
    'tech-peripherals',
    'merchandise-stationery',
    'study-drafting'
];

for (let i = 1; i <= 30; i++) {
    products.push({
        sku: `DUMMY-PROD-${i.toString().padStart(3, '0')}`,
        slug: `dummy-product-${i}`,
        name: `Sản phẩm mẫu ${i}`,
        categorySlug: categories[i % categories.length],
        shortDescription: `Đây là sản phẩm mẫu số ${i} dùng để test phân trang và UI trượt ngang.`,
        price: 10 + (i * 2.5),
        stockQuantity: 100 + i,
        condition: 'new',
        isFeatured: i % 5 === 0,
        image: '/PremiumLaptop.png',
        majorCodes: ['GENERAL'],
        tags: ['test', 'dummy']
    });
}

fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2));
console.log(`Đã thêm 30 sản phẩm vào ${jsonPath}`);
