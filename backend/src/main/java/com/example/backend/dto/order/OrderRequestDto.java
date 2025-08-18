package com.example.backend.dto.order;

import com.example.backend.dto.cart.CartItemDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequestDto { // 클라이언트 -> 서버 요청 DTO. 클라이언트가 입력하는 필드만 포함

    // 주문 생성 시 필요한 결제 및 배송 정보
    @NotBlank(message = "支払方法が選択されていません。")
    private String paymentMethod;

    @NotNull(message = "請求先住所IDは必須です。")
    private Long billingAddressId;

    @NotNull(message = "配送先住所IDは必須です。")
    private Long shippingAddressId;

    // 상세 페이지에서 직접 주문할 때 사용되는 필드
    // 장바구니 주문 시에는 이 필드들이 null 또는 공백
    private List<@Valid CartItemDto> cartItems;

    @Min(0)
    private Integer subtotal;

    @Min(0)
    private Integer shippingFee;

    @Min(0)
    private Integer tax;

    @Min(0)
    private Integer totalAmount;

    private LocalDateTime requestedDeliveryAt;
    private String requestedDeliveryTimeSlot;
}