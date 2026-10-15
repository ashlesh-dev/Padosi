package com.padosi.controller;

import com.padosi.dto.ServiceProviderResponse;
import com.padosi.dto.ServiceCategoryResponse;
import com.padosi.dto.CreateServiceProviderRequest;
import com.padosi.service.ServiceProviderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET  /api/services            - list available nearby providers
 * GET  /api/services/categories - service categories
 * POST /api/services            - create or renew the current user's listing
 */
@RestController
@RequestMapping("/api/services")
public class ServiceProviderController {

    private final ServiceProviderService serviceProviderService;

    public ServiceProviderController(ServiceProviderService serviceProviderService) {
        this.serviceProviderService = serviceProviderService;
    }

    @GetMapping
    public List<ServiceProviderResponse> getNearby(@AuthenticationPrincipal Long userId,
                                                   @RequestParam(required = false) Double radiusKm) {
        return serviceProviderService.getNearbyProviders(userId, radiusKm);
    }

    @GetMapping("/categories")
    public List<ServiceCategoryResponse> getCategories() {
        return serviceProviderService.getCategories();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceProviderResponse createOrRenew(@AuthenticationPrincipal Long userId,
                                                   @Valid @RequestBody CreateServiceProviderRequest request) {
        return serviceProviderService.createOrRenew(userId, request);
    }
}
