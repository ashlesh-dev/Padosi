package com.padosi.service;

import com.padosi.dto.LocalityResponse;
import com.padosi.repository.LocalityRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/** Business logic for localities. */
@Service
public class LocalityService {

    private final LocalityRepository localityRepository;

    public LocalityService(LocalityRepository localityRepository) {
        this.localityRepository = localityRepository;
    }

    /** All localities, sorted by name (for the register page dropdown). */
    public List<LocalityResponse> getAll() {
        return localityRepository.findAllByOrderByNameAsc().stream()
                .map(LocalityResponse::from)
                .toList();
    }
}
