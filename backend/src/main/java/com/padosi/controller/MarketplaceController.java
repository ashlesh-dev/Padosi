package com.padosi.controller;

import com.padosi.dto.MarketplaceResponse;
import com.padosi.service.MarketplaceService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET /api/marketplace   - list available items within the user's radius
 */
@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    public MarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @GetMapping
    public List<MarketplaceResponse> getNearby(@AuthenticationPrincipal Long userId) {
        return marketplaceService.getNearbyListings(userId);
    }
}
