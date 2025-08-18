package com.example.backend.dto.order;

import com.example.backend.dto.user.AddressDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryRequestDto {

    @NotEmpty(message = "配送日は必須項目です。")
    private LocalDateTime requestedDeliveryAt;

    @NotEmpty(message = "配送時間は必須項目です。")
    private String requestedDeliveryTimeSlot;

    @Valid
    private AddressDto shippingAddress;

    @Valid
    private AddressDto billingAddress;
}