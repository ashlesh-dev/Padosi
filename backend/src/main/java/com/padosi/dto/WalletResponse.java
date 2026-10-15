package com.padosi.dto;

import java.util.List;

public record WalletResponse(Long balance, List<WalletTransactionResponse> history) {}
