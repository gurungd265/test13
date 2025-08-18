package com.example.backend.repository.product;

import com.example.backend.entity.product.ProductReview;

import com.example.backend.entity.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    /*
        (deleted_at IS NULL 자동 필터링)
     */
    Page<ProductReview> findByProductId(Long productId, Pageable pageable);
    Page<ProductReview> findByUserId(Long userId, Pageable pageable);
}
