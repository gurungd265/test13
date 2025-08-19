import React from 'react';
import { FaBox, FaTruck, FaCheckCircle, FaStar, FaTimesCircle, FaRegCreditCard, FaUndo } from 'react-icons/fa';

/**
 * 注文ステータスに対応する情報（ラベル、アイコン、ステップ番号）を定義
 */
const statusMap = {
    'PENDING': { label: '注文受付', icon: <FaRegCreditCard />, step: 1 },
    'PROCESSING': { label: '商品準備', icon: <FaBox />, step: 2 },
    'SHIPPED': { label: '商品発送', icon: <FaTruck />, step: 3 },
    'DELIVERED': { label: '配達完了', icon: <FaCheckCircle />, step: 4 },
    'COMPLETED': { label: '購入確定', icon: <FaStar />, step: 5 },
    'CANCELLED': { label: '注文キャンセル', icon: <FaTimesCircle />, step: -1 },
    'REFUNDED': { label: '返金完了', icon: <FaUndo />, step: -2 },
    'PARTIALLY_REFUNDED': { label: '一部返金', icon: <FaUndo />, step: -2 },
};

/**
 * 注文の進捗状況を視覚的に表示するタイムラインコンポーネントです。
 * @param {{ status: string }} props - 現在の注文ステータス。
 */
const OrderStatusTimeline = ({ status }) => {
    // 現在のステータス情報とステップ番号を取得
    const currentStatus = statusMap[status] || {};
    const currentStep = currentStatus.step;

    // タイムラインに表示する主要なステップを定義
    const steps = [
        { label: '注文受付', step: 1, key: 'PENDING' },
        { label: '商品準備', step: 2, key: 'PROCESSING' },
        { label: '商品発送', step: 3, key: 'SHIPPED' },
        { label: '配達完了', step: 4, key: 'DELIVERED' },
        { label: '購入確定', step: 5, key: 'COMPLETED' },
    ];

    // 注文がキャンセルまたは返金された場合、通常のタイムラインの代わりに特別なメッセージを表示
    if (currentStep < 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 my-8 bg-gray-200 rounded-lg">
                <div className="text-4xl text-gray-600 mb-2">
                    {currentStatus.icon}
                </div>
                <div className="text-xl font-bold text-gray-800">
                    {currentStatus.label}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                    この注文は{currentStatus.label}されました。
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex justify-between items-center w-full px-4 md:px-0 mt-8 mb-12">
            {/* 背景ライン */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>

            {/* 進行度ライン（グラデーション効果） */}
            <div
                className="absolute top-1/2 left-0 h-1 transition-all duration-700 ease-in-out bg-gradient-to-r from-blue-400 to-blue-600 -translate-y-1/2 rounded-full"
                style={{ width: `${(currentStep - 1) * 25}%` }}
            ></div>

            {steps.map((step, index) => {
                // 現在のステップがタイムライン上のステップ以上であればアクティブとして扱います。
                const isActive = currentStep >= step.step;

                return (
                    <div key={index} className="relative flex-1 flex flex-col items-center">
                        {/* ステップアイコン */}
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 transform
                                ${isActive ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-gray-300 text-gray-500'}`}
                        >
                            {statusMap[step.key]?.icon}
                        </div>

                        {/* ステップラベル */}
                        <span
                            className={`mt-3 text-xs md:text-sm text-center font-semibold transition-colors duration-500
                                ${isActive ? 'text-blue-700' : 'text-gray-500'}`}
                        >
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default OrderStatusTimeline;