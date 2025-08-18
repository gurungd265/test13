import React, { useState, useEffect } from 'react';
import reviewApi from '../api/review';

const ProductReviewList = ({ productId, currentUser, token }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [editedContent, setEditedContent] = useState('');
    const [editedRating, setEditedRating] = useState(5);

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const response = await reviewApi.getReviewsByProduct(productId);
            setReviews(response.content);
        } catch (err) {
            setError('レビューの取得に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!window.confirm('このレビューを削除しますか？')) return;

        try {
            await reviewApi.deleteReview(productId, reviewId);
            await fetchReviews(); // 삭제 후 목록 갱신
        } catch (err) {
            alert('レビューの削除に失敗しました。');
        }
    };

    const handleEditStart = (review) => {
        setEditingReviewId(review.id);
        setEditedContent(review.reviewText);
        setEditedRating(review.rating);
    };

    const handleEditCancel = () => {
        setEditingReviewId(null);
        setEditedContent('');
        setEditedRating(5);
    };

    const handleEditSubmit = async (review) => {
        try {
            await reviewApi.updateReview({
                id: review.id,
                productId: productId,
                reviewText: editedContent,
                rating: editedRating,
            });
            await fetchReviews();
            handleEditCancel();
        } catch (err) {
            alert('レビューの更新に失敗しました。');
        }
    };

    if (loading) return <div>Loading reviews...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">商品レビュー</h2>
            {reviews.length === 0 ? (
                <p>レビューはまだありません。</p>
            ) : (
                <ul>
                    {reviews.map((review) => (
                        <li key={review.id} className="border-b py-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-yellow-500 font-semibold">
                                        {'⭐'.repeat(review.rating)}
                                    </div>
                                    <div className="text-gray-500 text-sm">
                                        {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                                    </div>
                                    <div className="font-semibold text-sm">{review.email}</div>
                                </div>

                                {currentUser === review.email && (
                                    <div className="flex gap-2 text-sm">
                                        <button
                                            onClick={() => handleEditStart(review)}
                                            className="text-gray-600 hover:underline"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDelete(review.id)}
                                            className="text-gray-600 hover:underline"
                                        >
                                            削除
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editingReviewId === review.id ? (
                                <div className="mt-2">
          <textarea
              className="w-full border rounded p-2"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
          />
                                    <div className="mt-2">
                                        <label>評価：</label>
                                        <select
                                            value={editedRating}
                                            onChange={(e) => setEditedRating(Number(e.target.value))}
                                        >
                                            {[1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num} ⭐
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            onClick={() => handleEditSubmit(review)}
                                            className="bg-blue-500 text-white px-3 py-1 rounded"
                                        >
                                            保存
                                        </button>
                                        <button
                                            onClick={handleEditCancel}
                                            className="bg-gray-300 px-3 py-1 rounded"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2">{review.reviewText}</div>
                            )}
                        </li>
                    ))}
                </ul>

            )}
        </div>
    );
};

export default ProductReviewList;
