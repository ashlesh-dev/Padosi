package com.padosi.service;

import com.padosi.dto.AuthResponse;
import com.padosi.dto.LoginRequest;
import com.padosi.dto.RegisterRequest;
import com.padosi.dto.UserResponse;
import com.padosi.entity.Locality;
import com.padosi.entity.User;
import com.padosi.repository.LocalityRepository;
import com.padosi.repository.UserRepository;
import com.padosi.security.JwtService;
import com.padosi.util.GeoUtils;
import org.locationtech.jts.geom.Point;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Register, login and "who am I". */
@Service
public class AuthService {

    /**
     * If the user's GPS position is further than this from every known locality,
     * we say Padosi is not available there yet (only Andheri, Mumbai is seeded).
     */
    private static final double SERVICE_AREA_METRES = 20_000;

    private final UserRepository userRepository;
    private final LocalityRepository localityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, LocalityRepository localityRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.localityRepository = localityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already registered");
        }

        // Work out the user's saved location + locality
        Point location;
        Locality locality;
        boolean hasGps = request.latitude() != null && request.longitude() != null;

        if (hasGps) {
            // 1) Browser geolocation: use the exact point, and find the nearest locality for display
            location = GeoUtils.point(request.latitude(), request.longitude());
            locality = localityRepository
                    .findNearestWithin(request.latitude(), request.longitude(), SERVICE_AREA_METRES)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Padosi is currently available only around Andheri, Mumbai. "
                                    + "Please choose your locality manually."));
        } else if (request.localityId() != null) {
            // 2) Manual fallback: use the centre of the chosen locality
            locality = localityRepository.findById(request.localityId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown locality"));
            location = locality.getCenter();
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Share your location or choose your locality");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password())) // BCrypt hash
                .phone(blankToNull(request.phone()))
                .locality(locality)
                .location(location)
                .build();
        user = userRepository.save(user);

        return AuthResponse.of(jwtService.generateToken(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // Same message for "no such email" and "wrong password" so attackers learn nothing
        ResponseStatusException invalid =
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");

        User user = userRepository.findByEmailIgnoreCase(request.email().trim()).orElseThrow(() -> invalid);

        if (!Boolean.TRUE.equals(user.getActive())
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalid;
        }
        return AuthResponse.of(jwtService.generateToken(user), UserResponse.from(user));
    }

    /** The currently logged-in user's profile. */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return UserResponse.from(user);
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
