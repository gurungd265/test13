package com.example.backend.service.payment;

import com.example.backend.dto.payment.CardRegistrationRequestDto;
import com.example.backend.entity.payment.Card;
import com.example.backend.repository.payment.CardRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class CardService {

    @Autowired
    private CardRepository cardRepository;

    public Optional<Card> getCardByUserId(String userId) {
        return cardRepository.findByUserId(userId);
    }

    @Transactional
    public Card registerCard(CardRegistrationRequestDto requestDto) {
        Optional<Card> existingCard = cardRepository.findByUserId(requestDto.getUserId());
        if (existingCard.isPresent()) {
            throw new IllegalStateException("すでに登録されているクレジットカードがあります。");
        }

        Card newCard = new Card();
        newCard.setUserId(requestDto.getUserId());
        newCard.setCardCompanyName(requestDto.getCardCompanyName());
        String maskedCardNumber = "XXXX-XXXX-XXXX-" + requestDto.getCardNumber().substring(12);
        newCard.setMaskedCardNumber(maskedCardNumber);
        newCard.setCardHolderName(requestDto.getCardHolderName());
        newCard.setExpiryDate(requestDto.getExpiryDate());
        newCard.setAvailableCredit(BigDecimal.ZERO); // 初期残高を0に明示的に設定

        return cardRepository.save(newCard);
    }

    // クレジットカードの利用可能残高を仮想的にチャージするメソッド
    @Transactional
    public Card topUpCardBalance(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("チャージ金額は0より大きくなければなりません。");
        }
        Card card = cardRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("クレジットカードが見つかりません。"));
        card.addCredit(amount);
        return cardRepository.save(card);
    }

    @Transactional
    public BigDecimal deductCreditBalance(String userId, BigDecimal amount) {
        Card card = cardRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("登録されたクレジットカードが見つかりませんでした。"));

        // `Card`エンティティの`subtractCredit`メソッドを使用して残高を差し引く
        // 残高不足の場合は、このメソッド内で例外がスローされる想定
        card.subtractCredit(amount);
        cardRepository.save(card); // 変更を保存

        return card.getAvailableCredit(); // 変更された残高を返却
    }

    // 크레딧 잔액을 추가하는 메서드 (환불/취소용)
    @Transactional
    public BigDecimal addCreditBalance(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("払い戻し金額は0より大きくなければなりません。");
        }

        Card card = cardRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("登録済みのクレジットカードが見つかりません。"));

        card.addCredit(amount);
        cardRepository.save(card);

        return card.getAvailableCredit();
    }
}
