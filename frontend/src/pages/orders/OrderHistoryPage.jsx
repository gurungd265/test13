import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import orderApi from "../../api/order";

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const fetchedOrders = await orderApi.getUserOrders();
                // Sort orders in descending order based on creation date (most recent first)
                const sortedOrders = fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                setOrders(sortedOrders);

                // Initialize the state to track which orders are expanded
                const initialExpanded = {};
                sortedOrders.forEach(order => {
                    initialExpanded[order.id] = false;
                });
                setExpandedOrders(initialExpanded);
            } catch (err) {
                console.error("注文履歴の読み込み中にエラーが発生しました：", err);
                setError("注文履歴の読み込み中にエラーが発生しました。ログイン状態を確認してください。");
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, []);

    // Toggles the expansion state of an order
    const toggleOrder = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    // Returns the display text for each order status
    const getStatusText = (status) => {
        switch (status) {
            case 'PENDING':
                return '注文受付';
            case 'PROCESSING':
                return '商品準備中';
            case 'SHIPPED':
                return '発送済み';
            case 'DELIVERED':
                return 'お届け済み';
            case 'CANCELLED':
                return 'キャンセル済み';
            case 'COMPLETED':
                return '完了';
            default:
                return '不明';
        }
    };

    // Returns a color class for a status badge
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
            case 'PROCESSING':
                return 'bg-yellow-100 text-yellow-800';
            case 'SHIPPED':
                return 'bg-blue-100 text-blue-800';
            case 'DELIVERED':
                return 'bg-purple-100 text-purple-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-600">読み込み中...</div>;
    }

    if (error) {
        return <div className="p-6 text-center text-red-600 font-medium">{error}</div>;
    }

    if (orders.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 min-h-screen flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">注文履歴</h2>
                <p className="text-gray-600 mb-6">まだ注文はありません</p>
                <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                    ホームページに戻る
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 md:mb-12 border-b-2 border-blue-500 pb-2 inline-block">注文履歴</h2>

            <div className="space-y-8">
                {orders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        {/* Order Header: Order number, date, and total amount */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 pb-6 border-b border-gray-200">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">注文番号</span>
                                <Link to={`/my-orders/${order.id}`} className="mt-1 text-lg font-bold text-blue-700 hover:text-blue-900 transition-colors">
                                    #{order.orderNumber}
                                </Link>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">注文日</span>
                                <span className="mt-1 text-lg font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex flex-col md:text-right">
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">合計金額</span>
                                <span className="mt-1 text-2xl font-bold text-gray-900">¥{order.totalAmount?.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Order Details: Status badge and toggle button */}
                        <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide ${getStatusBadgeColor(order.status)}`}>
                                    {getStatusText(order.status)}
                                </span>
                            </div>
                            <div className="mt-4 md:mt-0 flex items-center space-x-4 text-gray-600">
                                <span className="text-base font-medium">
                                    注文商品 ({order.orderItems?.length || 0} 件)
                                </span>
                                <button
                                    onClick={() => toggleOrder(order.id)}
                                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                >
                                    <span className="text-base font-medium">{expandedOrders[order.id] ? "閉じる" : "詳細を見る"}</span>
                                    {expandedOrders[order.id] ? <ChevronUp size={20} className="transition-transform duration-200" /> : <ChevronDown size={20} className="transition-transform duration-200" />}
                                </button>
                            </div>
                        </div>

                        {/* Product details list (collapsible) */}
                        {expandedOrders[order.id] && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="space-y-4">
                                    {order.orderItems?.map(item => (
                                        <div key={item.id} className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg shadow-inner">
                                            <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                                                <img
                                                    src={item.productImageUrl || "https://placehold.co/80x80/E2E8F0/1A202C?text=No+Image"}
                                                    alt={item.productName}
                                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                                />
                                            </div>
                                            <div className="flex-grow">
                                                <Link
                                                    to={`/product/${item.productId}`}
                                                    className="font-bold text-lg text-gray-800 hover:text-blue-600 hover:underline transition-colors"
                                                >
                                                    {item.productName}
                                                </Link>
                                                <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                                                    <p>数量: {item.quantity}</p>
                                                    <p>金額: ¥{item.productPrice?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}