package com.padosi.service;

import com.padosi.dto.MarketplaceResponse;
import com.padosi.entity.User;
import com.padosi.repository.MarketplaceListingRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Business logic for the second-hand marketplace. */
@Service
public class MarketplaceService {

    private static final double METRES_PER_KM = 1000.0;

    private final MarketplaceListingRepository listingRepository;
    private final UserRepository userRepository;

    public MarketplaceService(MarketplaceListingRepository listingRepository, UserRepository userRepository) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
    }

    /** Fetch available listings near the logged-in user. */
    @Transactional(readOnly = true)
    public List<MarketplaceResponse> getNearbyListings(Long userId) {
        User user = getUser(userId);
        double radiusMetres = user.getSearchRadiusKm() * METRES_PER_KM;
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        return listingRepository.findNearbyAvailable(lat, lon, radiusMetres, 50)
                .stream()
                .map(MarketplaceResponse::from)
                .toList();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
