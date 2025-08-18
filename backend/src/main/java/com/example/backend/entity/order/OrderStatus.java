package com.example.backend.entity.order;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum OrderStatus {
    PENDING,            // 승인 대기
    COMPLETED,          // 상품 준비중 (주문 완료)
    SHIPPED,            // 배송 중
    DELIVERED,          // 배송 완료
    REFUNDED,           // 전액 환불
    PARTIALLY_REFUNDED, // 부분 환불
    CANCELLED,          // 주문 취소
    PAYMENT_FAILED;     // 결제 실패

    @JsonCreator
    public static OrderStatus from(String value) {
        return value == null ? null : OrderStatus.valueOf(value.toUpperCase());
    }
}
