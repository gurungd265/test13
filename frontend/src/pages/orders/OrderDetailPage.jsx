import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import orderApi from "../../api/order";
import { FaTruck, FaBoxOpen, FaCheckCircle, FaTimesCircle, FaStar, FaUndo } from 'react-icons/fa';

export default function OrderDetailPage() {
    const navigate = useNavigate();

    // URLから注文IDを取得
    const { orderId } = useParams();

    // 状態変数を初期化
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState({ visible: false, message: '' });

    // 小計、配送料、税金、合計金額を計算するロジック
    const [calculatedTotals, setCalculatedTotals] = useState({
        subtotal: 0,
        shippingFee: 600, // チェックアウトページに合わせて固定値を設定
        tax: 0,
        totalAmount: 0,
    });

    useEffect(() => {
        const loadOrder = async () => {
            try {
                // APIを通じて特定の注文詳細情報を取得
                const fetchedOrder = await orderApi.getOrderDetail(orderId);
                setOrder(fetchedOrder);

                // 注文アイテムを元にフロントエンドで小計、税金、合計金額を再計算
                const calculatedSubtotal = (fetchedOrder.orderItems || []).reduce((sum, item) => {
                    return sum + (item.productPrice || 0) * (item.quantity || 0);
                }, 0);
                const shippingFee = 600; // 配送料はチェックアウトページと同じく固定
                const tax = Math.floor(calculatedSubtotal * 0.1);
                const totalAmount = calculatedSubtotal + shippingFee + tax;

                setCalculatedTotals({
                    subtotal: calculatedSubtotal,
                    shippingFee: shippingFee,
                    tax: tax,
                    totalAmount: totalAmount,
                });

            } catch (err) {
                console.error("注文詳細情報の読み込み中にエラーが発生しました:", err);
                setError("注文詳細情報の読み込み中にエラーが発生しました。ログイン状態を確認してください。");
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    // ロード中またはエラー発生時のUI
    if (loading) return <div className="text-center py-10 text-gray-600">読み込み中...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!order) return <div className="text-center py-10 text-gray-600">注文情報が存在しません。</div>;

    // 注文状況に応じたアイコンとテキストを返す
    const getStatusInfo = (status) => {
        switch (status) {
            case 'PENDING': return { text: '支払い待ち', icon: <FaBoxOpen /> };
            case 'PROCESSING': return { text: '出荷準備中', icon: <FaBoxOpen /> };
            case 'SHIPPED': return { text: '発送済み', icon: <FaTruck /> };
            case 'DELIVERED': return { text: '配達完了', icon: <FaCheckCircle /> };
            case 'CANCELLED': return { text: '注文キャンセル', icon: <FaTimesCircle /> };
            case 'COMPLETED': return { text: '注文確定済み', icon: <FaCheckCircle /> };
            default: return { text: '状態不明', icon: null };
        }
    };

    // ボタンクリックハンドラー（機能はバックエンドAPI呼び出しで実装する必要があります）
    const handleConfirmOrder = () => {
        setShowMessageModal({ visible: true, message: "注文が確定されました。" });
    };

    const handleReview = (productId, productImageUrl) => {
        console.log(productImageUrl);
        navigate(`/review/${productId}`, { state: { order, productImageUrl } });
    };

    const handleCancelOrder = () => {
        setShowMessageModal({ visible: true, message: "注文がキャンセルされました。" });
    };

    const handleRefund = () => {
        setShowRefundModal(true);
    };

    const statusInfo = getStatusInfo(order.status);
    const createdAtDate = new Date(order.createdAt).toLocaleDateString();

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
                <div className="bg-gray-100 p-6 rounded-lg mb-8 shadow-inner">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">注文商品</h3>
                    <ul className="divide-y divide-gray-300">
                        {order.orderItems?.map(item => (
                            <li key={item.id} className="flex flex-col md:flex-row items-start md:items-center py-4 relative"> {/* relative 추가 */}
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
                                    <p className="text-sm text-gray-500">単価: {(item.productPrice || 0).toLocaleString()}円</p>
                                </div>

                                {/* 버튼을 오른쪽 끝에 세로로 가운데 정렬 */}
                                <button
                                    onClick={() => handleReview(item.productId, item.productImageUrl)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-yellow-500 text-white rounded-full text-sm font-semibold hover:bg-yellow-600 transition-colors inline-flex items-center gap-2"
                                >
                                    レビューを書く
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* 支払い情報とボタン */}
                <div className="bg-gray-100 p-6 rounded-lg mb-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">支払い情報</h3>
                    <div className="space-y-2 text-gray-700">
                        <div className="flex justify-between items-center">
                            <span>小計</span>
                            <span className="font-medium">{calculatedTotals.subtotal.toLocaleString()}円</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>配送料</span>
                            <span className="font-medium">{calculatedTotals.shippingFee.toLocaleString()}円</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>税金</span>
                            <span className="font-medium">{calculatedTotals.tax.toLocaleString()}円</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-xl pt-4 border-t-2 border-gray-300 mt-4">
                            <span>合計金額</span>
                            <span>{calculatedTotals.totalAmount.toLocaleString()}円</span>
                        </div>
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-wrap justify-end gap-4">
                    {/* 주문 상태에 관계없이 모든 액션 버튼 표시 */}
                    <button
                        onClick={handleConfirmOrder}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
                    >
                        <FaCheckCircle /> 注文確定
                    </button>
                    <button
                        onClick={handleRefund}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
                    >
                        <FaUndo /> 返金申請
                    </button>
                    <button
                        onClick={handleCancelOrder}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
                    >
                        <FaTimesCircle /> 注文をキャンセル
                    </button>
                </div>
            </div>

            {/* 返金モーダル */}
            {showRefundModal && (
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
                                onClick={() => {
                                    // ここに返金申請APIの呼び出しロジックを追加
                                    setShowMessageModal({ visible: true, message: "返金申請が完了しました。" });
                                    setShowRefundModal(false);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                申請する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {showMessageModal.visible && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-8 bg-white w-96 max-w-md m-auto flex-col flex rounded-lg shadow-xl">
                        <h3 className="text-2xl font-bold mb-4">通知</h3>
                        <p className="text-gray-600 mb-6">{showMessageModal.message}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowMessageModal({ visible: false, message: '' })}
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
