import React, {useState, useEffect} from 'react';
import reviewApi from '../api/review';

const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;

    if (local.length <= 1) return email;

    const firstChar = local[0];
    const masked = '*'.repeat(local.length - 1);
    return `${firstChar}${masked}@${domain}`;
};

const StarRating = ({rating, onChange}) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div>
            {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (hoverRating || rating);
                return (
                    <span
                        key={star}
                        style={{
                            cursor: 'pointer',
                            color: isActive ? 'gold' : 'lightgray',
                            fontSize: '18px',
                            userSelect: 'none',
                        }}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                    >
            ★
          </span>
                );
            })}
        </div>
    );
};

const ProductReviewList = ({productId, currentUser}) => {
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
        setError(null);
        try {
            const response = await reviewApi.getReviewsByProduct(productId);
            setReviews(response.content);
        } catch {
            setError('レビューの取得に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!window.confirm('このレビューを削除しますか？')) return;

        try {
            await reviewApi.deleteReview(productId, reviewId);
            await fetchReviews();
        } catch {
            alert('レビューの削除に失敗しました。');
        }
    };

    const startEditing = (review) => {
        setEditingReviewId(review.id);
        setEditedContent(review.reviewText);
        setEditedRating(review.rating);
    };

    const cancelEditing = () => {
        setEditingReviewId(null);
        setEditedContent('');
        setEditedRating(5);
    };

    const submitEdit = async (review) => {
        if (!editedContent || editedContent.length < 10) {
            alert("レビューは10文字以上で入力してください。");
            return;
        }
        if (editedRating < 1) {
            alert("評価は1点以上を選択してください。");
            return;
        }
        try {
            await reviewApi.updateReview({
                id: review.id,
                productId,
                reviewText: editedContent,
                rating: editedRating,
            });
            await fetchReviews();
            cancelEditing();
        } catch {
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
                                <div style={{ flex: 1 }}>
                                    {editingReviewId === review.id ? null : (
                                        <>
                                            <div style={{ color: 'gold', fontWeight: '600', fontSize: '18px' }}>
                                                {'★'.repeat(review.rating)}
                                            </div>
                                            <div className="mt-2 whitespace-pre-wrap">
                                                {review.reviewText}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col items-end text-sm text-gray-700 min-w-[140px] ml-4">
                                    {editingReviewId === review.id ? null : (
                                        <>
                                            <div>{maskEmail(review.email)}</div>
                                            <div>{new Date(review.createdAt).toLocaleDateString('ja-JP')}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editingReviewId === review.id ? (
                                <div className="mt-2">
                                    <div className="mt-2 flex items-center gap-2 mb-1.5">
                                        <StarRating rating={editedRating} onChange={setEditedRating} />
                                    </div>
                                    <textarea
                                        className="w-full border rounded p-2"
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                    />
                                    <div className="mt-2 flex gap-2 justify-end">
                                        <button
                                            onClick={() => submitEdit(review)}
                                            className="bg-gray-100 px-2 py-0.5 rounded text-sm"
                                        >
                                            保存
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="bg-gray-100 px-2 py-0.5 rounded text-sm"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                currentUser === review.email && (
                                    <div className="flex justify-end mt-2 text-sm text-gray-700 gap-2">
                                        <button
                                            onClick={() => startEditing(review)}
                                            className="underline"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDelete(review.id)}
                                            className="underline"
                                        >
                                            削除
                                        </button>
                                    </div>
                                )
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

};

export default ProductReviewList;
