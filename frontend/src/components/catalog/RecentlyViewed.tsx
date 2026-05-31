import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import type { CatalogProduct } from '../../types/catalog';
import ProductCard from './ProductCard';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function RecentlyViewed() {
    const [products, setProducts] = useState<CatalogProduct[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('uteshop_recently_viewed');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setProducts(parsed);
                }
            }
        } catch {
            setProducts([]);
        }
    }, []);

    if (products.length === 0) return null;

    return (
        <section className="mt-20">
            <div className="mb-10">
                <h2 className="text-3xl font-bold text-on-surface">Sản phẩm đã xem</h2>
                <p className="mt-2 text-on-surface-variant">Danh sách các sản phẩm bạn vừa tham khảo gần đây</p>
            </div>

            <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={32}
                slidesPerView={1.2}
                navigation
                pagination={{ clickable: true }}
                breakpoints={{
                    640: { slidesPerView: 2.2 },
                    1024: { slidesPerView: 4 }
                }}
                className="!pb-14"
            >
                {products.map((product) => (
                    <SwiperSlide key={product.id} className="h-auto">
                        <ProductCard product={product} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
}
