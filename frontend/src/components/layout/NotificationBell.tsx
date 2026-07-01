import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { 
    FiBell, 
    FiShoppingBag, 
    FiStar, 
    FiFileText, 
    FiCalendar, 
    FiCheckSquare 
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'order_new':
            case 'order_status_update':
                return <FiShoppingBag className="text-emerald-500 w-4 h-4" />;
            case 'review_new':
                return <FiStar className="text-amber-500 w-4 h-4" />;
            case 'post_new':
                return <FiFileText className="text-indigo-500 w-4 h-4" />;
            case 'event_new':
                return <FiCalendar className="text-pink-500 w-4 h-4" />;
            default:
                return <FiBell className="text-blue-500 w-4 h-4" />;
        }
    };

    const getLink = (type: string, relatedId: string | null) => {
        if (!relatedId) return '#';
        switch (type) {
            case 'order_new':
            case 'order_status_update':
                // Nếu là Admin, có thể dẫn tới admin orders, User dẫn tới /profile/orders/:orderNumber
                return `/profile/orders/${relatedId}`;
            case 'review_new':
                return '#'; // review detail
            default:
                return '#';
        }
    };

    // Helper format thời gian đơn giản
    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút trước`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} giờ trước`;
            
            return date.toLocaleDateString('vi-VN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-gray-600 transition hover:text-primary p-1 rounded-full hover:bg-gray-100"
                aria-label="Thông báo"
            >
                <FiBell className="h-[22px] w-[22px]" strokeWidth={1.5} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-inter text-[9px] font-bold leading-none text-white animate-pulse whitespace-nowrap">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="font-semibold text-zinc-800 dark:text-white text-sm">
                            Thông báo
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition font-medium"
                            >
                                <FiCheckSquare className="w-3.5 h-3.5" />
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* Content List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <FiBell className="text-zinc-300 w-8 h-8 mb-2" />
                                <p className="text-xs text-zinc-400">Không có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`flex items-start gap-3 p-3 transition-colors ${
                                        !notification.isRead 
                                            ? 'bg-blue-50/30 dark:bg-blue-900/10' 
                                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                                    }`}
                                >
                                    {/* Left Icon */}
                                    <div className="flex-shrink-0 mt-0.5 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                        {getIcon(notification.type)}
                                    </div>

                                    {/* Middle Text */}
                                    <div className="flex-grow min-w-0" onClick={() => !notification.isRead && markAsRead(notification.id)}>
                                        <Link 
                                            to={getLink(notification.type, notification.relatedId)}
                                            className="block group"
                                        >
                                            <h5 className="font-medium text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-primary transition-colors leading-tight">
                                                {notification.title}
                                            </h5>
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                                {notification.content}
                                            </p>
                                            <span className="text-[10px] text-zinc-400 block mt-1">
                                                {formatTime(notification.createdAt)}
                                            </span>
                                        </Link>
                                    </div>

                                    {/* Right Dot if Unread */}
                                    {!notification.isRead && (
                                        <button 
                                            onClick={() => markAsRead(notification.id)}
                                            className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-2"
                                            title="Đánh dấu đã đọc"
                                        />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
