package com.padosi.service;

import com.padosi.dto.AlertResponse;
import com.padosi.dto.LostFoundResponse;
import com.padosi.entity.User;
import com.padosi.repository.AlertRepository;
import com.padosi.repository.LostFoundItemRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Business logic for emergency alerts and lost & found notices. */
@Service
public class AlertService {

    private static final double METRES_PER_KM = 1000.0;

    private final AlertRepository alertRepository;
    private final LostFoundItemRepository lostFoundItemRepository;
    private final UserRepository userRepository;

    public AlertService(AlertRepository alertRepository, LostFoundItemRepository lostFoundItemRepository,
                        UserRepository userRepository) {
        this.alertRepository = alertRepository;
        this.lostFoundItemRepository = lostFoundItemRepository;
        this.userRepository = userRepository;
    }

    /** Fetch active emergency alerts (MEDICAL, FIRE, SAFETY, etc.) near the user. */
    @Transactional(readOnly = true)
    public List<AlertResponse> getNearbyAlerts(Long userId) {
        User user = getUser(userId);
        double radiusMetres = user.getSearchRadiusKm() * METRES_PER_KM;
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        return alertRepository.findNearbyActive(lat, lon, radiusMetres, 20)
                .stream()
                .map(AlertResponse::from)
                .toList();
    }

    /** Fetch open Lost & Found notices near the user. */
    @Transactional(readOnly = true)
    public List<LostFoundResponse> getNearbyLostFound(Long userId) {
        User user = getUser(userId);
        double radiusMetres = user.getSearchRadiusKm() * METRES_PER_KM;
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        return lostFoundItemRepository.findNearbyOpen(lat, lon, radiusMetres, 30)
                .stream()
                .map(LostFoundResponse::from)
                .toList();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
