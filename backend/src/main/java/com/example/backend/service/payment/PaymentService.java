package com.example.backend.service.payment;

import com.example.backend.dto.payment.PaymentResponseDto;
import com.example.backend.entity.order.Order;
import com.example.backend.entity.order.OrderStatus;
import com.example.backend.entity.payment.Payment;
import com.example.backend.entity.payment.PaymentMethod;
import com.example.backend.entity.payment.PaymentStatus;
import com.example.backend.repository.order.OrderRepository;
import com.example.backend.repository.payment.PaymentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    private final CardService cardService;
    private final PaypayService paypayService;
    private final PointService pointService;

    /**
     * 결제 트랜잭션을 생성하고 처리합니다. (내부 가상 결제 시스템 사용)
     * @param userId 사용자 식별자 (이메일 또는 ID)
     * @param orderId 관련 주문의 ID
     * @param amount 결제 금액
     * @param paymentMethodStr 결제 방법의 문자열 (예: "PAYPAY", "VIRTUAL_CREDIT_CARD", "POINT")
     * @return 생성되고 처리된 Payment 엔티티
     */
    @Transactional
    public Payment createPayment(
            String userId,
            Long orderId,
            BigDecimal amount,
            String paymentMethodStr,
            String transactionId
    ) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("注文が見つかりません。"));

        PaymentMethod paymentMethod;
        try {
            paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("無効な決済手段です: " + paymentMethodStr);
        }

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setUserId(userId);
        payment.setAmount(amount);
        payment.setPaymentMethod(paymentMethod);
        payment.setTransactionId(transactionId);
        payment.setStatus(PaymentStatus.INITIATED);

        boolean paymentSuccess = false;
        String errorMessage = null;

        try {
            switch (paymentMethod) {
                case PAYPAY:
                    paypayService.deductPaypayBalance(userId, amount);
                    paymentSuccess = true;
                    break;
                case CREDIT_CARD:
                    cardService.deductCreditBalance(userId, amount);
                    paymentSuccess = true;
                    break;
                case POINT:
                    pointService.deductPoints(userId, amount);
                    paymentSuccess = true;
                    break;
                default:
                    throw new IllegalArgumentException("サポートされていない決済手段です: " + paymentMethodStr);
            }
        } catch (IllegalArgumentException | IllegalStateException | EntityNotFoundException e) {
            errorMessage = e.getMessage();
            log.error("内部決済処理中にエラーが発生しました: {}", errorMessage);
            paymentSuccess = false;
        } catch (Exception e) {
            errorMessage = "決済処理中に予期せぬエラーが発生しました。";
            log.error("内部決済処理中に予期せぬエラーが発生しました: {}", e.getMessage(), e);
            paymentSuccess = false;
        }

        if (paymentSuccess) {
            payment.setStatus(PaymentStatus.COMPLETED);
            order.setStatus(OrderStatus.PENDING);
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            order.setStatus(OrderStatus.PAYMENT_FAILED);
            throw new RuntimeException("決済処理に失敗しました: " + errorMessage);
        }

        paymentRepository.save(payment);
        orderRepository.save(order);

        return payment;
    }

    /**
     * 결제를 취소합니다.
     * @param transactionId 취소할 결제의 트랜잭션 ID
     * @return 취소된 결제의 DTO
     */
    @Transactional
    public PaymentResponseDto cancelPayment(String transactionId) {
        Payment payment = paymentRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new EntityNotFoundException("決済が見つかりません。"));

        if (payment.getStatus() == PaymentStatus.CANCELED) {
            throw new IllegalStateException("取り消しされた決済です。");
        }

        // 결제 수단에 따라 잔액 복구 로직 호출
        switch (payment.getPaymentMethod()) {
            case POINT:
                pointService.addPoints(payment.getUserId(), payment.getAmount());
                break;
            case PAYPAY:
                paypayService.addPaypayBalance(payment.getUserId(), payment.getAmount());
                break;
            case CREDIT_CARD:
                cardService.addCreditBalance(payment.getUserId(), payment.getAmount());
                break;
            default:
                throw new IllegalArgumentException("サポートされていない支払い方法です。");
        }

        payment.setStatus(PaymentStatus.CANCELED);
        paymentRepository.save(payment);

        Order order = payment.getOrder();
        if (order != null) {
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
        }

        return PaymentResponseDto.fromEntity(payment);
    }

    /**
     * 결제를 환불합니다.
     * @param transactionId 환불할 결제의 트랜잭션 ID
     * @param refundAmount 환불 금액
     * @return 환불된 결제의 DTO
     */
    @Transactional
    public PaymentResponseDto refundPayment(String transactionId, BigDecimal refundAmount) {
        // 1. transactionId로 결제 내역 조회, 없으면 예외 발생
        Payment payment = paymentRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new EntityNotFoundException("決済が見つかりません。"));

        // 2. 환불 수수료를 계산 (예시: 10%)
        BigDecimal refundFeeRate = new BigDecimal("0.10"); // 환불 수수료율 10%
        BigDecimal refundFee = refundAmount.multiply(refundFeeRate);

        // 3. 실제 환불 금액은 요청 금액에서 수수료를 뺀 금액
        BigDecimal finalRefundAmount = refundAmount.subtract(refundFee);

        // 4. 이미 전액 환불된 상태이거나, 총 환불액이 결제액을 초과하는지 등 기존 로직 수행
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new IllegalStateException("既に全額返金されています。");
        }

        BigDecimal newRefundAmount = payment.getRefundAmount() == null
                ? finalRefundAmount
                : payment.getRefundAmount().add(finalRefundAmount);

        switch (payment.getPaymentMethod()) {
            case POINT:
                pointService.addPoints(payment.getUserId(), refundAmount);
                break;
            case PAYPAY:
                paypayService.addPaypayBalance(payment.getUserId(), refundAmount);
                break;
            case CREDIT_CARD:
                cardService.addCreditBalance(payment.getUserId(), refundAmount);
                break;
            default:
                throw new IllegalArgumentException("サポートされていない支払い方法です。");
        }

        // 6. 결제 엔티티에 환불 금액 업데이트
        payment.setRefundAmount(newRefundAmount);

        // 7. 환불 금액과 결제 금액이 같으면 전액 환불, 아니면 부분 환불 처리
        Order order = payment.getOrder();

        if (newRefundAmount.compareTo(payment.getAmount()) == 0) {
            // 7-1. 전액 환불: 결제 상태와 주문 상태 모두 전액 환불 상태로 변경
            payment.setStatus(PaymentStatus.REFUNDED);
            if (order != null) {
                order.setStatus(OrderStatus.REFUNDED);
                orderRepository.save(order);
            }
        } else {
            // 7-2. 부분 환불: 결제 상태와 주문 상태를 부분 환불 상태로 변경
            payment.setStatus(PaymentStatus.PARTIALLY_REFUNDED);
            if (order != null) {
                order.setStatus(OrderStatus.PARTIALLY_REFUNDED);
                orderRepository.save(order);
            }
        }

        // 8. 결제 정보 업데이트 저장
        paymentRepository.save(payment);

        // 9. 결제 엔티티를 DTO로 변환하여 반환
        return PaymentResponseDto.fromEntity(payment);
    }

    @Transactional
    public List<PaymentResponseDto> cancelPaymentsByOrderId(Long orderId) {
        log.info("注文ID {} のすべての決済をキャンセルします。", orderId);

        // 1. 주문을 찾습니다.
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("注文が見つかりません: " + orderId));

        // 2. 주문에 연결된 모든 결제 내역을 찾습니다.
        List<Payment> payments = paymentRepository.findByOrder(order);

        if (payments.isEmpty()) {
            throw new IllegalStateException("この注文に関連する決済情報が見つかりません。");
        }

        List<PaymentResponseDto> canceledPayments = payments.stream()
                .map(payment -> {
                    try {
                        // 3. 각각의 결제 내역에 대해 취소 로직을 실행합니다.
                        return this.cancelPayment(payment.getTransactionId());
                    } catch (Exception e) {
                        log.error("決済トランザクションID {} のキャンセル中にエラーが発生しました。", payment.getTransactionId(), e);
                        throw new RuntimeException("決済キャンセルに失敗しました: " + e.getMessage());
                    }
                })
                .collect(Collectors.toList());

        // 4. 모든 결제가 성공적으로 취소되면 주문 상태를 업데이트합니다.
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        log.info("注文ID {} の決済が正常にキャンセルされました。キャンセルされた件数: {}", orderId, canceledPayments.size());
        return canceledPayments;
    }

    /**
     * 특정 주문별 결제 내역을 조회합니다.
     * @param orderId 주문 ID
     * @param userEmail 사용자 이메일
     * @return 결제 내역 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<PaymentResponseDto> getPaymentsByOrderId(Long orderId, String userEmail) {
        // 주문이 해당 유저의 주문인지 확인
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found or access denied"));

        // 사용자 권한 확인 (OrderService에서 넘어온 userEmail과 비교)
        if (!order.getUser().getEmail().equals(userEmail)) {
            throw new AccessDeniedException("No permission to access this order's payments.");
        }

        List<Payment> payments = paymentRepository.findByOrder(order);

        return payments.stream()
                .map(PaymentResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 결제 상태별 결제 내역 목록을 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<PaymentResponseDto> getPaymentsByStatus(PaymentStatus status) {
        List<Payment> payments = paymentRepository.findByStatus(status);
        return payments.stream()
                .map(PaymentResponseDto::fromEntity)
                .collect(Collectors.toList());
    }
}
