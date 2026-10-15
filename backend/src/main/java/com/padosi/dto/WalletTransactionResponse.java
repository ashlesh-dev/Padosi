package com.padosi.dto;

import com.padosi.entity.CoinTransaction;

import java.time.Instant;

public record WalletTransactionResponse(
        Long id,
        String entryType,
        Long amount,
        Long balanceAfter,
        String description,
        Instant createdAt
) {
    public static WalletTransactionResponse from(CoinTransaction transaction) {
        return new WalletTransactionResponse(
                transaction.getId(), transaction.getEntryType(), transaction.getAmount(),
                transaction.getBalanceAfter(), transaction.getDescription(), transaction.getCreatedAt());
    }
}
