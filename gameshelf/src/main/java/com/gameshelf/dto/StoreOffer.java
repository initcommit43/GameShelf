package com.gameshelf.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreOffer {
    private String storeName;
    private String price;
    private int discount;
    private String url;
}
