import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiShoppingBag, FiStar, FiFileText, FiCalendar, FiBell } from 'react-icons/fi';

export type NotificationType = 
    | 'success' 
    | 'error' 
    | 'warning' 
    | 'info' 
    | 'order_new' 
    | 'order_status_update' 
    | 'review_new' 
    | 'post_new' 
    | 'event_new';

export interface ToastMessage {
    id: string;
    title?: string;
    message: string;
    type: NotificationType;
}

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger';
}

interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'info' | 'warning' | 'danger';
    resolve: ((value: boolean) => void) | null;
}

interface NotificationContextProps {
    showToast: (message: string, type?: NotificationType, options?: { title?: string; duration?: number }) => void;
    toast: {
        success: (message: string, title?: string) => void;
        error: (message: string, title?: string) => void;
        warning: (message: string, title?: string) => void;
        info: (message: string, title?: string) => void;
    };
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Xác nhận',
        cancelText: 'Hủy',
        type: 'info',
        resolve: null
    });

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((
        message: string, 
        type: NotificationType = 'info', 
        options?: { title?: string; duration?: number }
    ) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, title: options?.title }]);

        const duration = options?.duration ?? 5000;
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, [removeToast]);

    const toast = {
        success: useCallback((message: string, title?: string) => showToast(message, 'success', { title }), [showToast]),
        error: useCallback((message: string, title?: string) => showToast(message, 'error', { title }), [showToast]),
        warning: useCallback((message: string, title?: string) => showToast(message, 'warning', { title }), [showToast]),
        info: useCallback((message: string, title?: string) => showToast(message, 'info', { title }), [showToast])
    };

    const showConfirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || 'Xác nhận',
                cancelText: options.cancelText || 'Hủy',
                type: options.type || 'info',
                resolve
            });
        });
    }, []);

    const handleConfirmClose = (value: boolean) => {
        if (confirmState.resolve) {
            confirmState.resolve(value);
        }
        setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    };

    const getToastIcon = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return <FiCheckCircle className="text-emerald-500 w-5 h-5" />;
            case 'error':
                return <FiAlertCircle className="text-rose-500 w-5 h-5" />;
            case 'warning':
                return <FiAlertTriangle className="text-amber-500 w-5 h-5" />;
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

    const getToastBorderColor = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return 'border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-300';
            case 'error':
                return 'border-rose-500/30 dark:border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10 text-rose-800 dark:text-rose-300';
            case 'warning':
                return 'border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300';
            case 'order_new':
            case 'order_status_update':
                return 'border-emerald-500/30 dark:border-emerald-500/20 bg-white dark:bg-zinc-900';
            case 'review_new':
                return 'border-amber-500/30 dark:border-amber-500/20 bg-white dark:bg-zinc-900';
            case 'post_new':
                return 'border-indigo-500/30 dark:border-indigo-500/20 bg-white dark:bg-zinc-900';
            case 'event_new':
                return 'border-pink-500/30 dark:border-pink-500/20 bg-white dark:bg-zinc-900';
            default:
                return 'border-blue-500/30 dark:border-blue-500/20 bg-white dark:bg-zinc-900';
        }
    };

    const getConfirmIcon = (type: 'info' | 'warning' | 'danger') => {
        switch (type) {
            case 'warning':
                return (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500">
                        <FiAlertTriangle className="h-7 w-7" />
                    </div>
                );
            case 'danger':
                return (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500">
                        <FiAlertCircle className="h-7 w-7" />
                    </div>
                );
            default:
                return (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-500">
                        <FiInfo className="h-7 w-7" />
                    </div>
                );
        }
    };

    const getConfirmBtnColor = (type: 'info' | 'warning' | 'danger') => {
        switch (type) {
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 shadow-amber-500/20';
            case 'danger':
                return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 shadow-rose-500/20';
            default:
                return 'bg-primary hover:bg-primary-container focus:ring-primary shadow-primary/20';
        }
    };

    return (
        <NotificationContext.Provider value={{ showToast, toast, showConfirm }}>
            {children}

            {/* Global Toasts Container */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-in ${getToastBorderColor(
                            t.type
                        )}`}
                    >
                        <div className="flex-shrink-0 mt-0.5 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                            {getToastIcon(t.type)}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                            {t.title && (
                                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                                    {t.title}
                                </h4>
                            )}
                            <p className="text-xs mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {t.message}
                            </p>
                        </div>

                        <button
                            onClick={() => removeToast(t.id)}
                            className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Global Confirm Modal Dialog */}
            {confirmState.isOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => handleConfirmClose(false)}
                >
                    <div 
                        className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 p-6 text-center shadow-2xl border border-zinc-150 dark:border-zinc-800/80 transition-all scale-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {getConfirmIcon(confirmState.type)}
                        
                        <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
                            {confirmState.title}
                        </h3>
                        
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 px-2 leading-relaxed">
                            {confirmState.message}
                        </p>

                        <div className="mt-6 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => handleConfirmClose(false)}
                                className="w-full rounded-2xl border border-outline-variant/40 dark:border-zinc-750 px-4 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.98]"
                            >
                                {confirmState.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirmClose(true)}
                                className={`w-full rounded-2xl py-3 px-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] ${getConfirmBtnColor(
                                    confirmState.type
                                )}`}
                            >
                                {confirmState.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};
