package com.example.backend.controller.order;

import com.example.backend.dto.order.OrderRequestDto;
import com.example.backend.dto.order.OrderResponseDto;
import com.example.backend.dto.payment.PaymentResponseDto;
import com.example.backend.entity.order.OrderStatus;
import com.example.backend.service.order.OrderService;
import com.example.backend.service.payment.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    /**
     * 주문 목록 조회                 GET	     /api/orders
     * 주문 상세 조회                 GET	     /api/orders/{orderId}
     * 주문별 결제내역 조회            GET      /api/orders/{orderId}/payments
     * 주문상태별 목록 조회            GET      /api/orders/status/{status}
     * 주문 취소                     DELETE	 /api/orders/{orderId}/cancel
     * 주문 생성 (상품 상세페이지)      POST     /api/orders
     * 주문 생성 (장바구니)           POST      /api/orders/cart
     */

    // 주문 목록 조회 (로그인 유저 기준)
    @GetMapping
    public ResponseEntity<List<OrderResponseDto>> getUserOrders(Principal principal) {
        log.info("Get orders request by user: {}", principal != null ? principal.getName() : "anonymous");
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();
        List<OrderResponseDto> orders = orderService.getOrdersByUserEmail(userEmail);
        log.info("Orders retrieved: count={}, user={}", orders.size(), userEmail);
        return ResponseEntity.ok(orders);
    }

    // 주문 상세 조회
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponseDto> getOrder(@PathVariable Long orderId, Principal principal) {
        log.info("Get order detail request: orderId={}, user={}", orderId, principal != null ? principal.getName() : "anonymous");
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();
        OrderResponseDto orderResponseDto = orderService.getOrderByIdAndUserEmail(orderId, userEmail);
        log.info("Order detail retrieved: orderId={}, user={}", orderResponseDto.getId(), userEmail);
        return ResponseEntity.ok(orderResponseDto);
    }

    // 주문별 결제 내역 조회
    @GetMapping("/{orderId}/payments")
    public ResponseEntity<List<PaymentResponseDto>> getPaymentsByOrderId(@PathVariable Long orderId, Principal principal) {
        log.info("Get payments by order request: orderId={}, user={}", orderId, principal != null ? principal.getName() : "anonymous");
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();
        List<PaymentResponseDto> payments = paymentService.getPaymentsByOrderId(orderId, userEmail);
        log.info("Payments retrieved: count={}, orderId={}, user={}", payments.size(), orderId, userEmail);
        return ResponseEntity.ok(payments);
    }

    @DeleteMapping("/{orderId}/cancel")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long orderId, Principal principal) {
        log.info("Cancel order request: orderId={}, user={}", orderId, principal != null ? principal.getName() : "anonymous");
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();

        orderService.cancelOrder(orderId, userEmail);

        log.info("Order cancelled successfully: orderId={}, user={}", orderId, userEmail);
        return ResponseEntity.noContent().build();
    }

    // 주문상태별 목록 조회 (관리자 권한)
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderResponseDto>> getOrdersByStatus(@PathVariable OrderStatus status) {
        log.info("Get orders by status request: status={}", status);
        List<OrderResponseDto> orders = orderService.getOrdersByStatus(status);
        log.info("Orders retrieved by status: count={}, status={}", orders.size(), status);
        return ResponseEntity.ok(orders);
    }

    // 주문 생성 =======================================================================================================

    // 1) 상세페이지 직접 주문 생성
    @PostMapping
    public ResponseEntity<OrderResponseDto> createOrderFromRequest(
            Principal principal,
            @Valid @RequestBody OrderRequestDto requestDto
    ) {
        log.info("Create order from request by user: {}", principal != null ? principal.getName() : "anonymous");
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();
        OrderResponseDto orderResponseDto = orderService.createOrderFromRequest(userEmail, requestDto);
        log.info("Order created from request successfully: orderId={}, user={}", orderResponseDto.getId(), userEmail);
        return ResponseEntity.status(201).body(orderResponseDto);
    }

    // 2) 장바구니 기반 주문 생성
    @PostMapping("/cart")
    public ResponseEntity<OrderResponseDto> createOrderFromCart(
            Principal principal,
            @Valid @RequestBody OrderRequestDto requestDto
    ) {
        log.info("Create order from cart request by user: {}", principal != null ? principal.getName() : "anonymous");
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();
        OrderResponseDto orderResponseDto = orderService.createOrderFromCart(userEmail, requestDto);
        log.info("Order created from cart successfully: orderId={}, user={}", orderResponseDto.getId(), userEmail);
        return ResponseEntity.status(201).body(orderResponseDto);
    }

    @PatchMapping("/{orderNumber}/status/{newStatus}")
    public ResponseEntity<Void> updateOrderStatus(
            Principal principal,
            @PathVariable String orderNumber,
            @PathVariable OrderStatus newStatus) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = principal.getName();

        // 서비스 로직에서 사용자의 소유권 확인
        orderService.updateOrderStatus(userEmail, orderNumber, newStatus);

        return ResponseEntity.ok().build();
    }
}