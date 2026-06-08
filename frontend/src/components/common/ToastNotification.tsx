import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { 
    FiShoppingBag, 
    FiStar, 
    FiFileText, 
    FiCalendar, 
    FiBell, 
    FiX 
} from 'react-icons/fi';

export const ToastNotification: React.FC = () => {
    const { toasts, removeToast } = useSocket();

    if (toasts.length === 0) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'order_new':
            case 'order_status_update':
                return <FiShoppingBag className="text-emerald-500 w-5 h-5" />;
            case 'review_new':
                return <FiStar className="text-amber-500 w-5 h-5" />;
            case 'post_new':
                return <FiFileText className="text-indigo-500 w-5 h-5" />;
            case 'event_new':
                return <FiCalendar className="text-pink-500 w-5 h-5" />;
            default:
                return <FiBell className="text-blue-500 w-5 h-5" />;
        }
    };

    const getBorderColor = (type: string) => {
        switch (type) {
            case 'order_new':
            case 'order_status_update':
                return 'border-emerald-500/30';
            case 'review_new':
                return 'border-amber-500/30';
            case 'post_new':
                return 'border-indigo-500/30';
            case 'event_new':
                return 'border-pink-500/30';
            default:
                return 'border-blue-500/30';
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start gap-3 p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border ${getBorderColor(toast.type)} rounded-2xl shadow-2xl transition-all duration-300 animate-slide-in`}
                >
                    <div className="flex-shrink-0 mt-0.5 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                        {getIcon(toast.type)}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                        <h4 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                            {toast.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {toast.content}
                        </p>
                    </div>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};
