package com.gameshelf.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreOffer {
    private String storeName;
    private String price;        // formatted, e.g. "$19.99"
    private String normalPrice;  // formatted list price; null when unknown or not discounted
    private int discount;        // percent off, 0 when no active sale
    private String url;
}
