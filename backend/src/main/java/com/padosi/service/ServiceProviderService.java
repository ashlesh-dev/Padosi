package com.padosi.service;

import com.padosi.dto.ServiceProviderResponse;
import com.padosi.entity.User;
import com.padosi.repository.ServiceProviderRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Business logic for local service providers (plumber, tutor, electrician, etc.). */
@Service
public class ServiceProviderService {

    private static final double METRES_PER_KM = 1000.0;

    private final ServiceProviderRepository serviceProviderRepository;
    private final UserRepository userRepository;

    public ServiceProviderService(ServiceProviderRepository serviceProviderRepository, UserRepository userRepository) {
        this.serviceProviderRepository = serviceProviderRepository;
        this.userRepository = userRepository;
    }

    /** Fetch available providers near the logged-in user, sorted by proximity. */
    @Transactional(readOnly = true)
    public List<ServiceProviderResponse> getNearbyProviders(Long userId) {
        User user = getUser(userId);
        double radiusMetres = user.getSearchRadiusKm() * METRES_PER_KM;
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        return serviceProviderRepository.findNearbyAvailable(lat, lon, radiusMetres, 30)
                .stream()
                .map(ServiceProviderResponse::from)
                .toList();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
