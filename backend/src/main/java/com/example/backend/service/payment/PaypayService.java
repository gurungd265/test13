package com.example.backend.service.payment;

import com.example.backend.dto.payment.PaypayRegistrationRequestDto;
import com.example.backend.entity.payment.PaypayAccount;
import com.example.backend.repository.payment.PaypayAccountRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class PaypayService {

    @Autowired
    private PaypayAccountRepository paypayAccountRepository;


    public BigDecimal getPaypayBalance(String userId) {
        return paypayAccountRepository.findByUserId(userId)
                .map(PaypayAccount::getBalance)
                .orElse(BigDecimal.ZERO);
    }


    public Optional<PaypayAccount> getPaypayAccountByUserId(String userId){
        return paypayAccountRepository.findByUserId(userId);
    }

    @Transactional
    public PaypayAccount registerPaypayAccount(PaypayRegistrationRequestDto requestDto) {
        Optional<PaypayAccount> existingPaypayAccount = paypayAccountRepository.findByUserId(requestDto.getUserId());
        if (existingPaypayAccount.isPresent()) {
            throw new IllegalStateException("すでに登録されているPayPayアカウントがあります。");
        }

        PaypayAccount newPaypayAccount = new PaypayAccount();
        newPaypayAccount.setUserId(requestDto.getUserId());
        newPaypayAccount.setPaypayId(requestDto.getPaypayId());
        newPaypayAccount.setBalance(BigDecimal.ZERO);

        return paypayAccountRepository.save(newPaypayAccount);
    }

    @Transactional
    public PaypayAccount topUpPaypayBalance(String userId, int amountInt) {
        BigDecimal amount = BigDecimal.valueOf(amountInt);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("チャージ金額は0より大きくなければなりません。");
        }
        PaypayAccount paypayAccount = paypayAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("PayPayアカウントが見つかりません。"));

        paypayAccount.addBalance(amount);
        return paypayAccountRepository.save(paypayAccount);
    }

    @Transactional
    public BigDecimal deductPaypayBalance(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("差し引く金額は0より大きくなければなりません。");
        }

        PaypayAccount paypayAccount = paypayAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("PayPayアカウントが見つかりませんでした。"));

        // 残高が十分にあるか確認
        if (paypayAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException("PayPay残高が不足しています。");
        }

        // 残高を差し引き、保存
        paypayAccount.subtractBalance(amount);
        paypayAccountRepository.save(paypayAccount);

        return paypayAccount.getBalance();
    }

    @Transactional
    public BigDecimal addPaypayBalance(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("환불 금액은 0보다 커야 합니다.");
        }

        PaypayAccount paypayAccount = paypayAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("PayPay 계정을 찾을 수 없습니다."));

        // 잔고를 더하고 저장
        paypayAccount.addBalance(amount);
        paypayAccountRepository.save(paypayAccount);

        return paypayAccount.getBalance();
    }
}
