import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import WriteReviewModal from "../components/reviews/WriteReviewModal";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchMyOrders } from "../store/profileSlice";
import { cancelOrder } from "../services/checkoutApi";
import { fetchEligibleReviewItems } from "../services/reviewApi";
import { useNotification } from "../context/NotificationContext";

const REVIEWABLE_STATUSES = new Set(["delivered"]);

const TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "processing", label: "Chuẩn bị hàng" },
  { id: "shipping", label: "Đang giao" },
  { id: "delivery_failed", label: "Giao thất bại" },
  { id: "delivered", label: "Đã giao" },
  { id: "returned", label: "Hoàn trả" },
  { id: "cancelled", label: "Đã hủy" },
  { id: "refunded", label: "Đã hoàn tiền" },
];



export default function MyOrdersPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { orders, ordersLoading, ordersError } = useAppSelector(
    (state) => state.profile,
  );

  const { toast } = useNotification();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrderNumber, setReviewOrderNumber] = useState<string | undefined>();
  const [reviewableOrderNumbers, setReviewableOrderNumbers] = useState<Set<string>>(
    () => new Set(),
  );

  const loadReviewableOrders = useCallback(async () => {
    try {
      const items = await fetchEligibleReviewItems();
      setReviewableOrderNumbers(
        new Set(items.map((item) => item.orderNumber)),
      );
    } catch {
      setReviewableOrderNumbers(new Set());
    }
  }, []);

  useEffect(() => {
    dispatch(fetchMyOrders());
    loadReviewableOrders();
  }, [dispatch, loadReviewableOrders]);

  const openReviewModal = (orderNumber: string) => {
    setReviewOrderNumber(orderNumber);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setReviewOrderNumber(undefined);
  };

  const handleReviewSuccess = () => {
    loadReviewableOrders();
    dispatch(fetchMyOrders());
  };

  const canReviewOrder = useMemo(
    () => (orderNumber: string, status: string) =>
      REVIEWABLE_STATUSES.has(status) && reviewableOrderNumbers.has(orderNumber),
    [reviewableOrderNumbers],
  );

  const handleCancelOrder = async (orderNumber: string) => {
    setCancelling(true);
    try {
      await cancelOrder(orderNumber);
      toast.success(`Hủy đơn hàng #${orderNumber} thành công`);
      dispatch(fetchMyOrders()); // Reload orders list
      setCancellingOrder(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể hủy đơn hàng",
      );
    } finally {
      setCancelling(false);
    }
  };

  // Filter and search logic
  const filteredOrders = orders.filter((order) => {
    // 1. Filter by status tab
    if (activeTab !== "all" && order.status !== activeTab) {
      return false;
    }

    // 2. Filter by search query (match orderNumber or product titles)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchNumber = order.orderNumber.toLowerCase().includes(query);
      const matchTitle = order.title.toLowerCase().includes(query);
      return matchNumber || matchTitle;
    }

    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-surface py-10 text-on-surface antialiased">
      <main className="mx-auto max-w-[1024px] px-6">
        {/* Header & Back breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant">
          <Link to="/profile" className="hover:text-primary transition">
            Tài khoản
          </Link>
          <span className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
          <span className="font-medium text-on-surface">Đơn hàng của tôi</span>
        </div>

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">
            Đơn hàng của tôi
          </h1>

          {/* Search bar input field */}
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-full bg-surface-container-low pl-12 pr-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
            />
          </div>
        </div>

        {/* Status Tabs Navigation */}
        <div className="mb-8 overflow-x-auto border-b border-outline-variant/30">
          <div className="flex min-w-max gap-2 pb-px">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-4 text-sm font-semibold transition-all ${
                    isActive
                      ? "text-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders Content List */}
        <div className="space-y-4">
          {ordersLoading && (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          )}

          {!ordersLoading && ordersError && (
            <div className="rounded-2xl bg-error-container p-6 text-center text-on-error-container">
              <p>{ordersError}</p>
              <button
                type="button"
                onClick={() => dispatch(fetchMyOrders())}
                className="mt-4 rounded-full bg-error px-6 py-2 text-xs font-semibold text-on-error"
              >
                Thử lại
              </button>
            </div>
          )}

          {!ordersLoading && !ordersError && filteredOrders.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-outline-variant p-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-outline">
                inbox
              </span>
              <p className="mt-4 text-base font-medium text-on-surface-variant">
                Không tìm thấy đơn hàng nào phù hợp.
              </p>
              <Link
                to="/categories"
                className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-on-primary transition active:scale-95"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          )}

          {!ordersLoading && !ordersError && filteredOrders.length > 0 && (
            <div className="flex flex-col gap-4">
              {filteredOrders.map((order) => {
                const canCancel =
                  order.status === "pending" || order.status === "confirmed";
                const canReview = canReviewOrder(order.orderNumber, order.status);

                return (
                  <div
                    key={order.orderNumber}
                    className="soft-shadow rounded-[28px] border border-outline-variant/30 bg-surface-container-lowest p-6 transition-all hover:border-primary/20"
                  >
                    <div className="flex flex-col justify-between gap-6 md:flex-row">
                      {/* Left: click → order detail */}
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/orders/${order.orderNumber}`)}
                        className="flex min-w-0 flex-1 cursor-pointer gap-4 text-left transition hover:opacity-90"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-container-high border border-outline-variant/20">
                          <img
                            src={order.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2 flex-wrap">
                            <span
                              className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${order.statusClass}`}
                            >
                              {order.statusLabel}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[10px] text-outline">
                              • {formatDate(order.placedAt)}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-on-surface">
                            {order.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant">
                            {order.detail}
                          </p>
                        </div>
                      </button>

                      {/* Right pricing & buttons */}
                      <div className="flex items-end justify-between md:flex-col md:items-end md:justify-start gap-4">
                        <div className="text-right">
                          <span
                            className={`text-2xl font-bold ${order.priceClass}`}
                          >
                            {order.price}
                          </span>
                          <p className="text-[11px] text-on-surface-variant leading-none mt-1">
                            Phương thức:{" "}
                            {order.payment?.method === "cod" ? "COD" : "Online"}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap justify-end">
                          {canReview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReviewModal(order.orderNumber);
                              }}
                              className="flex h-10 items-center justify-center gap-1 rounded-full border border-primary/30 px-4 text-xs font-semibold text-primary hover:bg-primary/5 active:scale-95 transition"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                rate_review
                              </span>
                              Đánh giá
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancellingOrder(order.orderNumber);
                              }}
                              className="flex h-10 items-center justify-center gap-2 rounded-full border border-error/20 px-4 text-xs font-semibold text-error hover:bg-error/5 active:scale-95 transition"
                            >
                              Hủy đơn
                            </button>
                          )}
                          <Link
                              to={`/profile/orders/${order.orderNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-outline-variant px-5 text-xs font-semibold text-on-surface-variant transition hover:border-primary hover:text-primary active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                receipt_long
                              </span>
                              Chi tiết đơn hàng
                            </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <WriteReviewModal
        open={reviewModalOpen}
        onClose={closeReviewModal}
        onSuccess={handleReviewSuccess}
        orderNumber={reviewOrderNumber}
      />

      {/* Premium Confirm Cancellation Dialog Modal popup */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="soft-shadow w-full max-w-md rounded-[28px] bg-surface-container-low p-8 border border-outline-variant/30 text-on-surface">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <span className="material-symbols-outlined text-[24px]">
                warning
              </span>
            </div>
            <h3 className="text-xl font-bold text-on-surface">
              Xác nhận hủy đơn hàng?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn hàng **#{cancellingOrder}**? Quyết
              định hủy đơn sẽ hoàn kho sản phẩm ngay lập tức và không thể hoàn
              tác.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={cancelling}
                className="h-12 rounded-full bg-surface-container-high px-6 text-sm font-semibold text-on-surface transition active:scale-95"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => handleCancelOrder(cancellingOrder)}
                disabled={cancelling}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-error px-6 text-sm font-semibold text-on-error hover:bg-red-700 hover:shadow-md transition active:scale-95 disabled:opacity-60"
              >
                {cancelling ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang hủy...
                  </>
                ) : (
                  "Đồng ý hủy đơn"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
