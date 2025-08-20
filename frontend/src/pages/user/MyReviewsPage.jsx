import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import reviewApi from '../../api/review.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function MyReviewsPage() {

    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.id) return;

        const fetchReviews = async () => {
            try {
                const data = await reviewApi.getReviewsByUser(user.id);
                setReviews(data.content);
            } catch (err) {
                setError('レビューの取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [user]);

    if (loading) return <div>読み込み中...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">マイレビュー</h1>
            {reviews.length === 0 ? (
                <p>まだレビューがありません。</p>
            ) : (
                <ul className="space-y-4">
                    {reviews.map((review) => (
                        <li key={review.id} className="border p-4 rounded">
                            <p className="font-medium">
                                商品ID: <Link to={`/product/${review.productId}`} className="text-blue-600 underline">
                                {review.productId}
                            </Link>
                            </p>
                            <p className="text-sm text-gray-600">{new Date(review.createdAt).toLocaleString()}</p>
                            <p className="text-yellow-500">★ {review.rating}</p>
                            <p className="mt-2">{review.reviewText}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
