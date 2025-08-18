package com.example.backend.service.payment;

import com.example.backend.dto.payment.BalanceResponseDto;
import com.example.backend.dto.payment.PointChargeRequestDto;
import com.example.backend.dto.payment.PointRefundRequestDto;
import com.example.backend.entity.payment.Card;
import com.example.backend.entity.payment.PaypayAccount;
import com.example.backend.entity.payment.UserPointBalance;
import com.example.backend.repository.payment.PaypayAccountRepository;
import com.example.backend.repository.payment.UserPointBalanceRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PointService {

    @Autowired
    private UserPointBalanceRepository userPointBalanceRepository;

    @Autowired
    private PaypayAccountRepository paypayAccountRepository;

    // [개선] CardService 의존성을 추가합니다.
    @Autowired
    private CardService cardService;

    public BigDecimal getPointBalance(String userId) {
        // 유저의 포인트 잔액을 찾고, 없을 경우 0을 반환합니다.
        return userPointBalanceRepository.findByUserId(userId)
                .map(UserPointBalance::getBalance)
                .orElse(BigDecimal.ZERO);
    }

    @Transactional
    public BigDecimal chargePointsWithCreditCard(PointChargeRequestDto requestDto) {
        BigDecimal amount = BigDecimal.valueOf(requestDto.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("チャージ金額は0より大きくなければなりません。");
        }

        UserPointBalance pointBalance = userPointBalanceRepository.findByUserId(requestDto.getUserId())
                .orElseGet(() -> {
                    UserPointBalance newPointBalance = new UserPointBalance();
                    newPointBalance.setUserId(requestDto.getUserId());
                    newPointBalance.setBalance(BigDecimal.ZERO);
                    return userPointBalanceRepository.save(newPointBalance);
                });
        pointBalance.addBalance(amount);
        userPointBalanceRepository.save(pointBalance);

        return pointBalance.getBalance();
    }

    @Transactional
    public BalanceResponseDto chargePointsWithPaypay(PointChargeRequestDto requestDto) {
        BigDecimal amount = BigDecimal.valueOf(requestDto.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("チャージ金額は0より大きくなければなりません。");
        }

        PaypayAccount paypayAccount = paypayAccountRepository.findByUserId(requestDto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("PayPayアカウントが見つかりません。"));

        if (paypayAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException("PayPay残高が不足しています。");
        }

        UserPointBalance pointBalance = userPointBalanceRepository.findByUserId(requestDto.getUserId())
                .orElseGet(() -> {
                    UserPointBalance newPointBalance = new UserPointBalance();
                    newPointBalance.setUserId(requestDto.getUserId());
                    newPointBalance.setBalance(BigDecimal.ZERO);
                    return userPointBalanceRepository.save(newPointBalance);
                });

        paypayAccount.subtractBalance(amount);
        pointBalance.addBalance(amount);

        paypayAccountRepository.save(paypayAccount);
        userPointBalanceRepository.save(pointBalance);

        // [개선] CardService를 사용하여 신용카드 잔액을 가져옵니다.
        BigDecimal virtualCardBalance = cardService.getCardByUserId(requestDto.getUserId())
                .map(Card::getAvailableCredit)
                .orElse(BigDecimal.ZERO);

        return new BalanceResponseDto(pointBalance.getBalance(), paypayAccount.getBalance(), virtualCardBalance);
    }

    @Transactional
    public BalanceResponseDto refundPointsToPaypay(PointRefundRequestDto requestDto) {
        BigDecimal amount = BigDecimal.valueOf(requestDto.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("払い戻し金額は0より大きくなければなりません。");
        }

        UserPointBalance pointBalance = userPointBalanceRepository.findByUserId(requestDto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("ポイント残高が見つかりません。"));

        if (pointBalance.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException("ポイント残高が不足しています。");
        }

        PaypayAccount paypayAccount = paypayAccountRepository.findByUserId(requestDto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("PayPayアカウントが見つかりません。"));

        pointBalance.subtractBalance(amount);
        paypayAccount.addBalance(amount);

        userPointBalanceRepository.save(pointBalance);
        paypayAccountRepository.save(paypayAccount);

        // [개선] CardService를 사용하여 신용카드 잔액을 가져옵니다.
        BigDecimal virtualCardBalance = cardService.getCardByUserId(requestDto.getUserId())
                .map(Card::getAvailableCredit)
                .orElse(BigDecimal.ZERO);

        return new BalanceResponseDto(pointBalance.getBalance(), paypayAccount.getBalance(), virtualCardBalance);
    }

    @Transactional
    public void deductPoints(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("差し引くポイント数は0より大きくなければなりません。");
        }

        UserPointBalance pointBalance = userPointBalanceRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("ユーザーのポイント残高が見つかりません。"));

        if (pointBalance.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("ポイント残高が不足しています。現在の残高: " + pointBalance.getBalance() + "、要求された金額: " + amount);
        }

        pointBalance.subtractBalance(amount);
        userPointBalanceRepository.save(pointBalance);
    }

    @Transactional
    public BigDecimal addPoints(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("追加するポイントは0より大きくなければなりません。");
        }

        UserPointBalance pointBalance = userPointBalanceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPointBalance newPointBalance = new UserPointBalance();
                    newPointBalance.setUserId(userId);
                    newPointBalance.setBalance(BigDecimal.ZERO);
                    return userPointBalanceRepository.save(newPointBalance);
                });

        pointBalance.addBalance(amount);
        userPointBalanceRepository.save(pointBalance);

        return pointBalance.getBalance();
    }
}
