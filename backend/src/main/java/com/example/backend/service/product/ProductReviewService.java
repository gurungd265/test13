package com.example.backend.service.product;

import com.example.backend.dto.product.ProductReviewDto;
import com.example.backend.entity.product.Product;
import com.example.backend.entity.product.ProductReview;
import com.example.backend.entity.user.User;
import com.example.backend.repository.product.ProductRepository;
import com.example.backend.repository.product.ProductReviewRepository;
import com.example.backend.repository.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProductReviewService {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public ProductReviewDto toDto(ProductReview review) {
        return new ProductReviewDto(
                review.getId(),
                review.getProduct().getId(),
                review.getUser().getEmail(),
                review.getRating(),
                review.getReviewText(),
                review.getIsApproved(),
                review.getCreatedAt()
        );
    }

    // 리뷰 등록
    public ProductReviewDto createReview(ProductReviewDto dto) {
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        ProductReview review = new ProductReview();
        review.setProduct(product);
        review.setUser(user);
        review.setRating(dto.getRating());
        review.setReviewText(dto.getReviewText());
        review.setIsApproved(false);
        review.setCreatedAt(LocalDateTime.now());

        ProductReview savedReview = reviewRepository.save(review);
        return toDto(savedReview);
    }

    // 상품별 리뷰 목록 조회 (소프트 삭제된 리뷰는 자동으로 제외됨)
    public Page<ProductReviewDto> getReviewsByProduct(Long productId, Pageable pageable) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("商品が見つかりません。"));

        Page<ProductReview> page = reviewRepository.findByProductId(productId, pageable);
        return page.map(this::toDto);
    }

    // 유저별 리뷰 목록 조회 (소프트 삭제된 리뷰는 자동으로 제외됨)
    public Page<ProductReviewDto> getReviewsByUser(Long userId, Pageable pageable) {
        return reviewRepository.findByUserId(userId, pageable)
                .map(this::toDto);
    }

    // 리뷰 수정
    @Transactional
    public void updateReview(ProductReviewDto dto, Long currentUserId) {
        ProductReview review = reviewRepository.findById(dto.getId())
                .orElseThrow(() -> new EntityNotFoundException("レビューが見つかりません。"));

        // 리뷰 작성자와 로그인된 사용자가 같은지 확인
        if (!review.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("レビューの編集権限がありません。");
        }


        review.setRating(dto.getRating());
        review.setReviewText(dto.getReviewText());
        reviewRepository.save(review);
    }

    // 리뷰 삭제
    @Transactional
    public void softDeleteReview(ProductReviewDto dto, Long currentUserId) {
        ProductReview review = reviewRepository.findById(dto.getId())
                .orElseThrow(() -> new EntityNotFoundException("レビューが見つかりません。"));

        // 리뷰 작성자와 로그인된 사용자가 같은지 확인
        if (!review.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("レビューの削除権限がありません。");
        }

        // 소프트 삭제 처리
        review.setDeletedAt(java.time.LocalDateTime.now());
        reviewRepository.save(review);
    }
}
