package com.padosi.controller;

import com.padosi.dto.AlertResponse;
import com.padosi.dto.LostFoundResponse;
import com.padosi.service.AlertService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET /api/alerts       - emergency alerts near the user (MEDICAL, FIRE, SAFETY, etc.)
 * GET /api/alerts/lost-found - lost & found notices near the user
 */
@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public List<AlertResponse> getNearbyAlerts(@AuthenticationPrincipal Long userId) {
        return alertService.getNearbyAlerts(userId);
    }

    @GetMapping("/lost-found")
    public List<LostFoundResponse> getNearbyLostFound(@AuthenticationPrincipal Long userId) {
        return alertService.getNearbyLostFound(userId);
    }
}
