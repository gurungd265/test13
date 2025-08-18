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
            order.setStatus(OrderStatus.COMPLETED);
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
                pointService.deductPoints(payment.getUserId(), payment.getAmount());
                break;
            case PAYPAY:
                paypayService.deductPaypayBalance(payment.getUserId(), payment.getAmount());
                break;
            case CREDIT_CARD:
                cardService.deductCreditBalance(payment.getUserId(), payment.getAmount());
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

        // 2. 이미 전액 환불된 상태라면 추가 환불 불가, 예외 발생
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new IllegalStateException("既に全額返金されています。");
        }

        // 3. 기존 환불 금액에 이번 환불 요청 금액을 더함 (기존 환불 없으면 이번 금액 그대로)
        BigDecimal newRefundAmount = payment.getRefundAmount() == null
                ? refundAmount
                : payment.getRefundAmount().add(refundAmount);

        // 4. 환불 총액이 결제 금액을 초과하면 예외 발생
        if (newRefundAmount.compareTo(payment.getAmount()) > 0) {
            throw new IllegalArgumentException("返金額が支払額を超えています。");
        }

        // [변경] 외부 결제 시스템 환불 요청 대신, 내부 잔액 복구 로직 필요
        // 여기서는 간단히 성공으로 가정하고, 실제 구현에서는 각 서비스의 복구 메서드 호출
        boolean refundSuccess = true; // externalPaymentService.refund(transactionId, refundAmount);
        if (!refundSuccess) {
            throw new RuntimeException("返金処理に失敗しました。");
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
