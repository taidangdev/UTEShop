import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { FiSearch, FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import ProductSearchBox from '../catalog/ProductSearchBox';
import { useCartItemCount } from '../../hooks/useCartItemCount';
import NotificationBell from './NotificationBell';

const PRIMARY = '#004AC6';
const TEXT_BODY = '#434655';

interface NavLink {
    label: string;
    to: string;
    matchPath?: boolean;
}

const NAV_LINKS: NavLink[] = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Sản phẩm', to: '/categories', matchPath: true },
    { label: 'Mã giảm giá', to: '/coupons' },
    { label: 'Hỗ trợ & Liên hệ', to: '/support' }
];

function isNavActive(location: Location, link: NavLink): boolean {
    if (link.matchPath) {
        return location.pathname === '/categories' && !location.search.includes('category=');
    }
    if (link.to.includes('?')) {
        return `${location.pathname}${location.search}` === link.to;
    }
    if (link.to === '/') {
        return location.pathname === '/' && !location.hash;
    }
    if (link.to.startsWith('/#')) {
        return location.pathname === '/' && location.hash === link.to.slice(1);
    }
    return location.pathname === link.to;
}

export default function ShopHeader() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.auth.user);
    const [search, setSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const cartCount = useCartItemCount();

    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        }
        if (isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus input smoothly after opening
            setTimeout(() => {
                if (searchInputRef.current) searchInputRef.current.focus();
            }, 50);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen]);

    // Close search when navigating
    useEffect(() => {
        setIsSearchOpen(false);
    }, [location.pathname, location.search]);

    const handleSearchSubmit = (term: string) => {
        const q = term.trim();
        if (q) {
            navigate(`/categories?q=${encodeURIComponent(q)}`);
        } else {
            navigate('/categories');
        }
        setIsSearchOpen(false);
    };

    return (
        <header className="fixed top-0 z-50 w-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Main Header (Logo, Nav, Icons on one row) */}
            <div className="relative mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between gap-4 px-6 lg:gap-8 lg:px-8">
                {/* Left: Logo */}
                <Link
                    to="/"
                    className="shrink-0 font-inter text-2xl font-bold transition hover:opacity-80"
                    style={{ color: PRIMARY }}
                >
                    UTEShop
                </Link>

                {/* Center: Navigation Bar */}
                <nav className="hidden items-center gap-8 md:flex">
                    {[
                        ...NAV_LINKS,
                        ...(user && user.role !== 'admin'
                            ? [{ label: 'Ký gửi', to: '/consignments' }]
                            : [])
                    ].map((link) => {
                        const active = isNavActive(location, link);
                        return (
                            <Link
                                key={link.label}
                                to={link.to}
                                className="font-inter text-[15px] font-medium transition-colors hover:text-primary"
                                style={{
                                    color: active ? PRIMARY : TEXT_BODY,
                                    fontWeight: active ? 600 : 500
                                }}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Icons */}
                <div className="flex shrink-0 items-center gap-5 sm:gap-6">
                    {/* Search Icon Toggle */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="text-gray-600 transition hover:text-primary"
                        aria-label="Mở tìm kiếm"
                    >
                        <FiSearch className="h-[22px] w-[22px]" strokeWidth={1.5} />
                    </button>

                    {/* User */}
                    <Link
                        to={user ? "/profile" : "/login"}
                        className="text-gray-600 transition hover:text-primary"
                        aria-label="Tài khoản"
                    >
                        <FiUser className="h-[22px] w-[22px]" strokeWidth={1.5} />
                    </Link>

                    {/* Notification Bell */}
                    {user && <NotificationBell />}

                    {/* Cart */}
                    <Link
                        to="/cart"
                        className="relative text-gray-600 transition hover:text-primary"
                        aria-label={
                            cartCount > 0 ? `Giỏ hàng, ${cartCount} sản phẩm` : 'Giỏ hàng'
                        }
                    >
                        <FiShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.5} />
                        {cartCount > 0 && (
                            <span className="absolute -top-2.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 font-inter text-[10px] font-bold leading-none text-white whitespace-nowrap">
                                {cartCount > 99 ? '99+' : cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Mobile Menu Toggle (Visible only on small screens) */}
                    <button className="text-gray-600 transition hover:text-primary md:hidden" aria-label="Menu">
                        <FiMenu className="h-6 w-6" strokeWidth={1.5} />
                    </button>
                </div>

                {/* Expandable Search Overlay (Covers the Nav row when open) */}
                {isSearchOpen && (
                    <div 
                        ref={searchContainerRef}
                        className="absolute inset-x-0 top-0 z-10 flex h-20 items-center bg-white px-6 shadow-sm lg:px-8"
                    >
                        <div className="flex w-full items-center gap-4">
                            <div className="flex-1">
                                <ProductSearchBox
                                    value={search}
                                    onChange={setSearch}
                                    onSearch={handleSearchSubmit}
                                    placeholder="Tìm kiếm sản phẩm, thiết bị, giáo trình..."
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(false)}
                                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                                aria-label="Đóng tìm kiếm"
                            >
                                <FiX className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
