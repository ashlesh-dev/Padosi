package com.padosi.controller;

import com.padosi.dto.DemoTopUpRequest;
import com.padosi.dto.WalletResponse;
import com.padosi.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public WalletResponse getWallet(@AuthenticationPrincipal Long userId) {
        return walletService.getWallet(userId);
    }

    /** Demo-only top-up endpoint. No UPI request or real payment is performed. */
    @PostMapping("/demo-top-up")
    public WalletResponse demoTopUp(@AuthenticationPrincipal Long userId,
                                    @Valid @RequestBody DemoTopUpRequest request) {
        return walletService.demoTopUp(userId, request.coins());
    }
}
