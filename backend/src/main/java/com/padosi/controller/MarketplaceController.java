package com.padosi.controller;

import com.padosi.dto.CreateMarketplaceRequest;
import com.padosi.dto.MarketplaceResponse;
import com.padosi.dto.ReportListingRequest;
import com.padosi.service.MarketplaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    public MarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @GetMapping
    public List<MarketplaceResponse> getNearby(@AuthenticationPrincipal Long userId,
                                               @RequestParam(required = false) Double radius) {
        return marketplaceService.getNearbyListings(userId, radius);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MarketplaceResponse createListing(@AuthenticationPrincipal Long userId,
                                             @Valid @RequestBody CreateMarketplaceRequest request) {
        return marketplaceService.createListing(userId, request);
    }
    
    @GetMapping("/saved")
    public List<MarketplaceResponse> getSavedListings(@AuthenticationPrincipal Long userId) {
        return marketplaceService.getSavedListings(userId);
    }

    @PostMapping("/{id}/save")
    public void toggleSaveListing(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        marketplaceService.toggleSaveListing(userId, id);
    }

    @PostMapping("/{id}/report")
    public void reportListing(@AuthenticationPrincipal Long userId, 
                              @PathVariable Long id,
                              @Valid @RequestBody ReportListingRequest request) {
        marketplaceService.reportListing(userId, id, request);
    }
}
