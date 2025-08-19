import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import orderApi from "../../api/order";
import { refundPointsToPayPay } from "../../api/virtualPayments";
import { FaTruck, FaBoxOpen, FaCheckCircle, FaTimesCircle, FaStar, FaUndo, FaArrowLeft, FaRegCreditCard } from 'react-icons/fa';
import useDeliveryOptions from '../../hooks/useDeliveryOptions';
import OrderStatusTimeline from '../../components/order/OrderStatusTimeline';

/**
 * メッセージモーダルを管理するカスタムフック
 */
const useMessageModal = () => {
    const [showMessageModal, setShowMessageModal] = useState({ visible: false, message: '' });
    const showMessage = useCallback((message) => {
        setShowMessageModal({ visible: true, message });
    }, []);
    const closeModal = useCallback(() => {
        setShowMessageModal({ visible: false, message: '' });
    }, []);
    return { showMessageModal, showMessage, closeModal };
};

export default function OrderDetailPage() {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRefundModal, setShowRefundModal] = useState(false);

    const { showMessageModal, showMessage, closeModal } = useMessageModal();
    const { DELIVERY_TIME_SLOTS } = useDeliveryOptions();

    /**
     * 注文合計を計算するメモ化された関数
     */
    const calculatedTotals = useMemo(() => {
        if (!order) return { subtotal: 0, shippingFee: 600, tax: 0, totalAmount: 0 };
        const subtotal = (order.orderItems || []).reduce((sum, item) => {
            return sum + (item.productPrice || 0) * (item.quantity || 0);
        }, 0);
        const shippingFee = 600;
        const tax = Math.floor(subtotal * 0.1);
        const totalAmount = subtotal + shippingFee + tax;
        return { subtotal, shippingFee, tax, totalAmount };
    }, [order]);

    /**
     * 注文情報を非同期でロードする関数
     */
    const loadOrder = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedOrder = await orderApi.getOrderDetail(orderId);
            const today = new Date();

            // 配達完了から3日経過した場合、自動で注文を確定します。
            if (fetchedOrder.status === 'DELIVERED' && fetchedOrder.deliveredAt) {
                const deliveredDate = new Date(fetchedOrder.deliveredAt);
                const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

                if (today.getTime() > deliveredDate.getTime() + threeDaysInMs) {
                    await orderApi.updateOrderStatus(fetchedOrder.orderNumber, 'COMPLETED');
                    const updatedOrder = await orderApi.getOrderDetail(orderId);
                    setOrder(updatedOrder);
                    showMessage("配達完了から3日経過したため、注文が自動確定されました。");
                    return;
                }
            }

            // 配送情報を整形します。
            const deliveryInfo = {};
            if (fetchedOrder.requestedDeliveryAt) {
                const dateObj = new Date(fetchedOrder.requestedDeliveryAt);
                deliveryInfo.estimatedDeliveryDate = dateObj.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
                const timeKey = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                const timeSlot = DELIVERY_TIME_SLOTS.find(slot => slot.timeKey === timeKey);
                deliveryInfo.estimatedDeliveryTime = timeSlot ? timeSlot.label : '未定';
            } else {
                deliveryInfo.estimatedDeliveryDate = '未定';
                deliveryInfo.estimatedDeliveryTime = '未定';
            }

            setOrder({ ...fetchedOrder, ...deliveryInfo });
            setError(null);
        } catch (err) {
            console.error("注文詳細情報の読み込み中にエラーが発生했습니다:", err);
            setError("注文詳細情報の読み込み中にエラーが発生しました。ログイン状態を確認してください。");
        } finally {
            setLoading(false);
        }
    }, [orderId, DELIVERY_TIME_SLOTS, showMessage]);

    /**
     * 注文確定処理
     */
    const handleConfirmOrder = useCallback(async () => {
        try {
            await orderApi.updateOrderStatus(order.orderNumber, 'COMPLETED');
            showMessage("注文が確定されました。");
            loadOrder();
        } catch (err) {
            showMessage("注文確定処理に失敗しました。");
        }
    }, [order, showMessage, loadOrder]);

    /**
     * 注文キャンセル処理
     */
    const handleCancelOrder = useCallback(async () => {
        try {
            await orderApi.cancelOrder(orderId);
            showMessage("注文がキャンセルされました。");
            loadOrder();
        } catch (err) {
            showMessage("注文キャンセル処理に失敗しました。");
        }
    }, [orderId, showMessage, loadOrder]);

    /**
     * 返金処理
     */
    const handleRefund = useCallback(async () => {
        try {
            const userId = order.userId;
            const refundAmount = calculatedTotals.totalAmount;

            if (!userId || refundAmount <= 0) {
                showMessage("返金に必要な情報が不足しています。");
                return;
            }

            await refundPointsToPayPay(userId, refundAmount);
            await orderApi.updateOrderStatus(order.orderNumber, 'REFUND_REQUESTED');

            setShowRefundModal(false);
            showMessage("返金申請が完了しました。");
            loadOrder();
        } catch (err) {
            showMessage("返金申請処理に失敗しました。");
        }
    }, [order, calculatedTotals, showMessage, loadOrder]);

    /**
     * レビューページへのナビゲート
     */
    const handleReview = useCallback((productId, productImageUrl) => {
        navigate(`/review/${productId}`, { state: { order, productImageUrl } });
    }, [navigate, order]);

    // コンポーネントがマウントされたときに注文情報をロードします。
    useEffect(() => {
        if (orderId) {
            loadOrder();
        }
    }, [orderId, loadOrder]);

    if (loading) return <div className="text-center py-10 text-gray-600">読み込み中...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!order) return <div className="text-center py-10 text-gray-600">注文情報が存在しません。</div>;

    /**
     * ステータスに応じたテキストとアイコンを返します。
     */
    const getStatusInfo = (status) => {
        switch (status) {
            case 'PENDING': return { text: '注文受付済み', icon: <FaRegCreditCard /> };
            case 'PROCESSING': return { text: '出荷準備中', icon: <FaBoxOpen /> };
            case 'SHIPPED': return { text: '発送済み', icon: <FaTruck /> };
            case 'DELIVERED': return { text: '配達完了', icon: <FaCheckCircle /> };
            case 'COMPLETED': return { text: '購入確定済み', icon: <FaStar /> };
            case 'CANCELLED': return { text: '注文キャンセル', icon: <FaTimesCircle /> };
            case 'REFUND_REQUESTED': return { text: '返金申請済み', icon: <FaUndo /> };
            default: return { text: '状態不明', icon: null };
        }
    };

    const statusInfo = getStatusInfo(order.status);

    const isCompleted = order.status === 'COMPLETED';
    const isDelivered = order.status === 'DELIVERED';
    const canCancel = ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status);
    const canRefund = isCompleted && order.completedAt && (new Date().getTime() - new Date(order.completedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

    const timeLeftForCompletion = (() => {
        if (!isDelivered || !order.deliveredAt) return null;
        const deliveredDate = new Date(order.deliveredAt);
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        const timeLeft = deliveredDate.getTime() + threeDaysInMs - new Date().getTime();

        if (timeLeft <= 0) return null;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}時間 ${minutes}分`;
    })();

    return (
        <div className="bg-gray-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => navigate('/orders')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                    >
                        <FaArrowLeft />
                        <span>注文履歴に戻る</span>
                    </button>
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-700">
                        {statusInfo.icon}
                        <span>現在の状態: {statusInfo.text}</span>
                    </div>
                </div>

                {/* 注文状態タイムライン */}
                <OrderStatusTimeline status={order.status} />

                {/* 注文情報セクション */}
                <div className="mt-8">
                    <div className="bg-gray-50 p-6 rounded-xl mb-6 shadow-inner">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">注文商品</h3>
                        <ul className="divide-y divide-gray-200">
                            {order.orderItems?.map(item => (
                                <li key={item.id} className="flex flex-col md:flex-row items-start md:items-center py-4 relative">
                                    <div className="flex-shrink-0 mb-4 md:mb-0">
                                        <img
                                            src={item.productImageUrl || "https://placehold.co/100x100/e2e8f0/64748b?text=No+Image"}
                                            alt={item.productName}
                                            className="w-24 h-24 object-cover rounded-lg shadow-md"
                                        />
                                    </div>
                                    <div className="flex-grow md:ml-6 w-full">
                                        <Link to={`/product/${item.productId}`} className="text-lg font-bold hover:text-blue-600 transition-colors">
                                            {item.productName}
                                        </Link>
                                        <p className="text-sm text-gray-500">数量: {item.quantity}</p>
                                        <p className="text-base font-semibold text-gray-700">{(item.productPrice || 0).toLocaleString()}円</p>
                                    </div>
                                    {isCompleted && (
                                        <button
                                            onClick={() => handleReview(item.productId, item.productImageUrl)}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-yellow-400 text-white rounded-full text-sm font-bold hover:bg-yellow-500 transition-colors inline-flex items-center gap-2 shadow-md"
                                        >
                                            <FaStar /> レビューを書く
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl mb-6 shadow-inner">
                        <h4 className="text-2xl font-bold text-gray-800 mb-4">配送情報</h4>
                        <div className="space-y-2 text-gray-700">
                            <div className="flex justify-between">
                                <span className="font-semibold">到着予定日:</span>
                                <span>{order.estimatedDeliveryDate || '未定'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">到着予定時刻:</span>
                                <span>{order.estimatedDeliveryTime || '未定'}</span>
                            </div>
                            {order.status === 'SHIPPED' && (
                                <div className="flex justify-between items-center text-blue-600 font-semibold pt-2">
                                    <span>配送追跡:</span>
                                    <a href="#" className="underline hover:text-blue-800 transition-colors">ここをクリック</a>
                                </div>
                            )}
                            {isDelivered && timeLeftForCompletion && (
                                <div className="flex justify-between items-center pt-2 border-t mt-4">
                                    <span className="text-sm font-semibold text-gray-600">自動注文確定まで残り:</span>
                                    <span className="text-sm font-bold text-red-500">{timeLeftForCompletion}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl mb-6 shadow-inner">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">支払い情報</h3>
                        <div className="space-y-2 text-gray-700">
                            <div className="flex justify-between items-center">
                                <span>小計</span>
                                <span className="font-medium">{calculatedTotals.subtotal?.toLocaleString()}円</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>配送料</span>
                                <span className="font-medium">{calculatedTotals.shippingFee?.toLocaleString()}円</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>税金</span>
                                <span className="font-medium">{calculatedTotals.tax?.toLocaleString()}円</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-xl pt-4 border-t-2 border-gray-300 mt-4">
                                <span>合計金額</span>
                                <span>{calculatedTotals.totalAmount?.toLocaleString()}円</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-4 mt-8">
                    {isDelivered && (
                        <button
                            onClick={handleConfirmOrder}
                            className={`py-3 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold`}
                        >
                            <FaCheckCircle /> 注文確定
                        </button>
                    )}
                    {canRefund && (
                        <button
                            onClick={() => setShowRefundModal(true)}
                            className={`py-3 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold`}
                        >
                            <FaUndo /> 返金申請
                        </button>
                    )}
                    {canCancel && (
                        <button
                            onClick={handleCancelOrder}
                            className={`py-3 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-bold`}
                        >
                            <FaTimesCircle /> 注文をキャンセル
                        </button>
                    )}
                </div>
            </div>

            {showRefundModal.visible && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-8 bg-white w-96 max-w-md m-auto flex-col flex rounded-lg shadow-xl">
                        <h3 className="text-2xl font-bold mb-4">返金申請</h3>
                        <p className="text-gray-600 mb-6">
                            返金申請をしますか？商品が返品された後に返金処理が行われます。
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleRefund}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                申請する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMessageModal.visible && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-8 bg-white w-96 max-w-md m-auto flex-col flex rounded-lg shadow-xl">
                        <h3 className="text-2xl font-bold mb-4">通知</h3>
                        <p className="text-gray-600 mb-6">{showMessageModal.message}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}