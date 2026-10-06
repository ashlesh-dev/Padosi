package com.padosi.controller;

import com.padosi.dto.LocalityResponse;
import com.padosi.service.LocalityService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** GET /api/localities - list of localities (public, used before signup). */
@RestController
@RequestMapping("/api/localities")
public class LocalityController {

    private final LocalityService localityService;

    public LocalityController(LocalityService localityService) {
        this.localityService = localityService;
    }

    @GetMapping
    public List<LocalityResponse> getAll() {
        return localityService.getAll();
    }
}
