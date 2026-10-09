package com.padosi.service;

import com.padosi.dto.CreateMarketplaceRequest;
import com.padosi.dto.MarketplaceResponse;
import com.padosi.dto.ReportListingRequest;
import com.padosi.entity.*;
import com.padosi.entity.enums.ItemCondition;
import com.padosi.entity.enums.ListingCategory;
import com.padosi.entity.enums.ListingStatus;
import com.padosi.entity.enums.ReportReason;
import com.padosi.repository.ListingReportRepository;
import com.padosi.repository.MarketplaceListingRepository;
import com.padosi.repository.SavedListingRepository;
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
    private final SavedListingRepository savedListingRepository;
    private final ListingReportRepository listingReportRepository;

    public MarketplaceService(MarketplaceListingRepository listingRepository,
                              UserRepository userRepository,
                              SavedListingRepository savedListingRepository,
                              ListingReportRepository listingReportRepository) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.savedListingRepository = savedListingRepository;
        this.listingReportRepository = listingReportRepository;
    }

    /** Fetch available listings near the logged-in user, with optional custom radius override. */
    @Transactional(readOnly = true)
    public List<MarketplaceResponse> getNearbyListings(Long userId, Double customRadiusKm) {
        User user = getUser(userId);
        double radiusKm = (customRadiusKm != null && customRadiusKm > 0) ? customRadiusKm : user.getSearchRadiusKm();
        double radiusMetres = radiusKm * METRES_PER_KM;
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        
        return listingRepository.findNearbyAvailable(lat, lon, radiusMetres, 50)
                .stream()
                .map(listing -> {
                    boolean isSaved = savedListingRepository.existsByIdListingIdAndIdUserId(listing.getId(), userId);
                    return MarketplaceResponse.from(listing, isSaved);
                })
                .toList();
    }

    @Transactional
    public MarketplaceResponse createListing(Long userId, CreateMarketplaceRequest req) {
        User user = getUser(userId);
        MarketplaceListing listing = MarketplaceListing.builder()
                .seller(user)
                .locality(user.getLocality())
                .title(req.title())
                .price(req.price())
                .category(ListingCategory.valueOf(req.category()))
                .itemCondition(ItemCondition.valueOf(req.itemCondition()))
                .description(req.description())
                .status(ListingStatus.AVAILABLE)
                .location(user.getLocation())
                .build();
        
        if (req.imageUrl() != null && !req.imageUrl().isBlank()) {
            ListingImage img = ListingImage.builder()
                    .listing(listing)
                    .imageUrl(req.imageUrl())
                    .displayOrder((short)0)
                    .build();
            listing.getImages().add(img);
        }
        
        listing = listingRepository.save(listing);
        return MarketplaceResponse.from(listing, false);
    }

    @Transactional
    public void toggleSaveListing(Long userId, Long listingId) {
        if (!listingRepository.existsById(listingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found");
        }
        SavedListingId id = new SavedListingId(listingId, userId);
        if (savedListingRepository.existsById(id)) {
            savedListingRepository.deleteById(id);
        } else {
            SavedListing saved = SavedListing.builder()
                    .id(id)
                    .listing(listingRepository.getReferenceById(listingId))
                    .user(userRepository.getReferenceById(userId))
                    .build();
            savedListingRepository.save(saved);
        }
    }

    @Transactional
    public void reportListing(Long userId, Long listingId, ReportListingRequest req) {
        MarketplaceListing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
                
        if (listingReportRepository.existsByListingIdAndReporterId(listingId, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You have already reported this listing");
        }
        
        ListingReport report = ListingReport.builder()
                .listing(listing)
                .reporter(getUser(userId))
                .reason(ReportReason.valueOf(req.reason()))
                .description(req.description())
                .build();
                
        listingReportRepository.save(report);
    }
    
    @Transactional(readOnly = true)
    public List<MarketplaceResponse> getSavedListings(Long userId) {
        return savedListingRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(saved -> MarketplaceResponse.from(saved.getListing(), true))
                .toList();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
