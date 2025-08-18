package com.example.backend.dto.order;

import com.example.backend.dto.payment.PaymentResponseDto;
import com.example.backend.dto.user.AddressDto;
import com.example.backend.entity.order.OrderStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponseDto { // 조회용 DTO. 서버에서 클라이언트(관리자)로 보내는 데이터

    private Long id;
    private Long userId; // User 엔티티의 PK (혹은 email 등 필요하면 추가 가능)
    private String orderNumber;
    private OrderStatus status; // enum
    private BigDecimal totalAmount; // <OrderRequsetDto> subtotal + tax + shippingFee
    private AddressDto shippingAddress;
    private AddressDto billingAddress;
    private LocalDateTime createdAt;

    private LocalDateTime deliveredAt;
    private LocalDateTime completedAt;
    private LocalDateTime requestedDeliveryAt;

    private LocalDateTime updatedAt;

    private List<OrderItemDto> orderItems;
    private List<PaymentResponseDto> payments;

}