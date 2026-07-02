import { Link } from 'react-router-dom';
import type { CatalogProduct } from '../../types/catalog';
import ProductCard from './ProductCard';

interface SimilarProductsProps {
    products: CatalogProduct[];
    categoryName?: string | null;
}

export default function SimilarProducts({ products, categoryName }: SimilarProductsProps) {
    if (products.length === 0) return null;

    return (
        <section className="mt-20">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-on-surface">Sản phẩm tương tự</h2>
                    <p className="mt-2 text-on-surface-variant">
                        {categoryName
                            ? `Thêm sản phẩm trong ${categoryName}`
                            : 'Có thể bạn cũng thích các sản phẩm này'}
                    </p>
                </div>
                <Link
                    to="/categories"
                    className="text-sm font-semibold text-primary hover:underline"
                >
                    Xem tất cả
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
}
