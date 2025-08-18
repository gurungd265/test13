import React, { useState, useEffect } from 'react';
import reviewApi from '../api/review';

const ProductReviewList = ({ productId }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await reviewApi.getReviewsByProduct(productId);  // reviewApi를 사용하여 리뷰 목록 조회
                console.log('response:', response);
                setReviews(response.content);
            } catch (err) {
                setError('レビューの取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [productId]);  // 상품 ID가 변경될 때마다 리뷰 목록을 다시 가져옴

    if (loading) {
        return <div>Loading reviews...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">商品レビュー</h2>
            {reviews.length === 0 ? (
                <p>レビューはまだありません。</p>
            ) : (
                <ul>
                    {reviews.map((review) => (
                        <li key={review.id} className="border-b py-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-semibold">{review.email}</div>
                                    <div className="text-gray-500 text-sm">{new Date(review.createdAt).toLocaleDateString('ja-JP')}</div>
                                </div>
                                <div className="text-yellow-500">
                                    {'⭐'.repeat(review.rating)} {/* 별점 표시 */}
                                </div>
                            </div>
                            <div className="mt-2">{review.reviewText}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ProductReviewList;
