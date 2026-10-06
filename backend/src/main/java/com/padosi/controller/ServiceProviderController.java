package com.padosi.controller;

import com.padosi.dto.ServiceProviderResponse;
import com.padosi.service.ServiceProviderService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET /api/services      - list available service providers within the user's radius
 */
@RestController
@RequestMapping("/api/services")
public class ServiceProviderController {

    private final ServiceProviderService serviceProviderService;

    public ServiceProviderController(ServiceProviderService serviceProviderService) {
        this.serviceProviderService = serviceProviderService;
    }

    @GetMapping
    public List<ServiceProviderResponse> getNearby(@AuthenticationPrincipal Long userId) {
        return serviceProviderService.getNearbyProviders(userId);
    }
}
