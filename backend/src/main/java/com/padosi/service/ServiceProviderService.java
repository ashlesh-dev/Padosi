package com.padosi.service;

import com.padosi.dto.ServiceProviderResponse;
import com.padosi.dto.ServiceCategoryResponse;
import com.padosi.dto.CreateServiceProviderRequest;
import com.padosi.entity.ServiceCategory;
import com.padosi.entity.ServiceProvider;
import com.padosi.entity.User;
import com.padosi.repository.ServiceCategoryRepository;
import com.padosi.repository.ServiceProviderRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** Business logic for local service providers (plumber, tutor, electrician, etc.). */
@Service
public class ServiceProviderService {

    private static final double METRES_PER_KM = 1000.0;

    private final ServiceProviderRepository serviceProviderRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final UserRepository userRepository;
    private final WalletService walletService;

    public ServiceProviderService(ServiceProviderRepository serviceProviderRepository,
                                  ServiceCategoryRepository serviceCategoryRepository,
                                  UserRepository userRepository,
                                  WalletService walletService) {
        this.serviceProviderRepository = serviceProviderRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.userRepository = userRepository;
        this.walletService = walletService;
    }

    @Transactional(readOnly = true)
    public List<ServiceCategoryResponse> getCategories() {
        return serviceCategoryRepository.findAll().stream()
                .map(ServiceCategoryResponse::from).toList();
    }

    /** Fetch available providers near the logged-in user, sorted by proximity. */
    @Transactional(readOnly = true)
    public List<ServiceProviderResponse> getNearbyProviders(Long userId, Double customRadiusKm) {
        User user = getUser(userId);
        double radiusKm = customRadiusKm != null && customRadiusKm >= 1 && customRadiusKm <= 10
                ? customRadiusKm
                : (user.getSearchRadiusKm() == null ? 5 : user.getSearchRadiusKm());
        double radiusMetres = radiusKm * METRES_PER_KM;
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        return serviceProviderRepository.findNearbyAvailable(lat, lon, radiusMetres, 30)
                .stream()
                .map(ServiceProviderResponse::from)
                .toList();
    }

    @Transactional
    public ServiceProviderResponse createOrRenew(Long userId, CreateServiceProviderRequest request) {
        User user = getUser(userId);
        if (!"BUSINESS".equals(user.getAccountType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only Professional accounts can list paid local services.");
        }
        short days = request.durationDays();
        if (days != 7 && days != 14 && days != 30) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a listing duration of 7, 14, or 30 days.");
        }
        ServiceCategory category = serviceCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid service category."));

        int months = (days + 29) / 30;
        walletService.chargeListing(userId, months, "Local service listing (" + days + " days)");

        ServiceProvider provider = serviceProviderRepository.findByUserId(userId)
                .orElseGet(() -> ServiceProvider.builder().user(user).build());
        provider.setCategory(category);
        provider.setHeadline(request.headline().trim());
        provider.setDescription(blankToNull(request.description()));
        provider.setContactPhone(blankToNull(request.contactPhone()));
        provider.setExperienceYears(request.experienceYears());
        provider.setAvailable(true);
        provider.setDurationDays(days);
        provider.setExpiresAt(Instant.now().plus(days, ChronoUnit.DAYS));
        return ServiceProviderResponse.from(serviceProviderRepository.save(provider));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
