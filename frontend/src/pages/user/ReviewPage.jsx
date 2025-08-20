import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useState } from "react";
import reviewApi from '../../api/review.js';

const ReviewPage = () => {
    const { productId } = useParams();  // URL에서 productId를 추출
    const navigate = useNavigate();  // 페이지 이동을 위해 사용

    const [review, setReview] = useState(''); // 리뷰 내용 상태
    const [rating, setRating] = useState(0); // 평점 상태
    const [message, setMessage] = useState(''); // 메시지 상태
    const [loading, setLoading] = useState(false); // 로딩 상태

    const handleReviewSubmit = async () => {
        if (!review || review.length < 10) {
            setMessage("レビューは10文字以上で入力してください。");
            return;
        }

        if (rating < 1) {
            setMessage("評価は1点以上を選択してください。");
            return;
        }

        setLoading(true);
        try {
            const reviewData = {
                productId,
                rating: parseInt(rating),
                reviewText: review,
            };

            console.log("Sending review data:", reviewData);

            // 리뷰 등록 요청
            await reviewApi.addReview(reviewData);

            setMessage("レビューが投稿されました。");
            setReview('');
            setRating(0);

            // 리뷰 등록 후 상품 상세 페이지로 이동
            navigate(`/product/${productId}`);
        } catch (error) {
            console.error("Error posting review:", error);
            setMessage("投稿に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="review-page max-w-2xl mx-auto px-4 py-8 text-center">
            <h1 className="text-xl text-center font-bold">商品はいかがでしょうか？</h1>
            <div className="flex items-center justify-center mt-4 text-4xl">
                {[...Array(5)].map((_, index) => {
                    const isActive = rating > index;
                    return (
                        <span
                            key={index}
                            className={`cursor-pointer select-none ${isActive ? 'text-yellow-500' : 'text-gray-300'}`}
                            onClick={() => setRating(index + 1)}
                        >
                            ★
                        </span>
                    );
                })}
            </div>

            <textarea
                className="mt-4 w-full p-4 border rounded-lg"
                rows="6"
                placeholder="レビューを書く…"
                value={review}
                onChange={(e) => setReview(e.target.value)}
            />

            <button
                onClick={handleReviewSubmit}
                disabled={loading}
                className={`mt-4 px-6 py-2 rounded-full text-white ${loading ? 'bg-gray-400' : 'bg-yellow-500 hover:bg-yellow-600'}`}
            >
                {loading ? '投稿中...' : '投稿'}
            </button>

            {message && (
                <div className={`mt-4 text-sm ${message.includes('失敗') ? 'text-red-500' : 'text-green-500'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default ReviewPage;
