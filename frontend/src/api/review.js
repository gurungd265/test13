import api from './index';  // axios

const reviewApi = {
    addReview: async (reviewData, token) => {
        try {
            const response = await api.post(
                `/api/products/${reviewData.productId}/reviews`,
                reviewData
            );
            console.log('Review response:', response);
            return response.data;
        } catch (error) {
            console.error('Failed to post review:', error);
            if (error.response) {
                console.error('Error response data:', error.response.data);
            }
            throw error;
        }
    },

    getReviewsByProduct: async (productId, page = 0, size = 10, sort = 'createdAt,desc') => {
        try {
            const response = await api.get(
                `/api/products/${productId}/reviews`,
                {
                    params: { page, size, sort }
                }
            );
            console.log('Reviews response:', response);
            return response.data; // { content: [...], totalPages, totalElements, ... }
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            throw error;
        }
    },

    getReviewsByUser: async (userId, page = 0, size = 10, sort = 'createdAt,desc', token) => {
        try {
            const response = await api.get(
                `/api/products/reviews/user/${userId}`,
                {
                    params: { page, size, sort }
                }
            );
            console.log('User reviews response:', response);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch user reviews:', error);
            throw error;
        }
    },
};

export default reviewApi;
