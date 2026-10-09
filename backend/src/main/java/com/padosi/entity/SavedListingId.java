package com.padosi.entity;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class SavedListingId implements Serializable {
    private Long listingId;
    private Long userId;
}
