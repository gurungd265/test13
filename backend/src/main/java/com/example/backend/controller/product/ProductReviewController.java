package com.example.backend.controller.product;

import com.example.backend.dto.product.ProductReviewDto;
import com.example.backend.service.product.ProductReviewService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
@RequiredArgsConstructor
public class ProductReviewController {

    private final ProductReviewService reviewService;

    // 리뷰 등록
    @PostMapping
    public ResponseEntity<ProductReviewDto> createReview(
            @PathVariable Long productId,
            @Valid @RequestBody ProductReviewDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        dto.setProductId(productId);
        dto.setEmail(userDetails.getUsername());
        ProductReviewDto created = reviewService.createReview(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // 상품별 리뷰 목록 조회 (페이징)
    @GetMapping
    public ResponseEntity<Page<ProductReviewDto>> getReviewsByProduct(
            @PathVariable Long productId,
            Pageable pageable
    ) {
        Page<ProductReviewDto> reviews = reviewService.getReviewsByProduct(productId, pageable);
        return ResponseEntity.ok(reviews);
    }

    // 리뷰 수정
    @PutMapping("/{reviewId}")
    public ResponseEntity<Void> updateReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ProductReviewDto dto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        dto.setProductId(productId);
        dto.setId(reviewId);
        reviewService.updateReview(dto, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // 리뷰 소프트 삭제
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {  // 로그인한 사용자 정보
        ProductReviewDto dto = new ProductReviewDto();
        dto.setProductId(productId);
        dto.setId(reviewId);
        String currentUserEmail = userDetails.getUsername();
        reviewService.softDeleteReview(dto, currentUserEmail);
        return ResponseEntity.noContent().build();
    }
}
