package com.example.backend.controller.user;

import com.example.backend.dto.product.ProductReviewDto;
import com.example.backend.service.product.ProductReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class UserReviewController {

    private final ProductReviewService reviewService;

    // 유저별 리뷰 목록 조회 (페이징)
    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<ProductReviewDto>> getReviewsByUser(
            @PathVariable Long userId,
            Pageable pageable
    ) {
        Page<ProductReviewDto> reviews = reviewService.getReviewsByUser(userId, pageable);
        return ResponseEntity.ok(reviews);
    }
}
