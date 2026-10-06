package com.padosi.dto;

import com.padosi.entity.Locality;

/** Locality data sent to the frontend (no coordinates needed). */
public record LocalityResponse(Long id, String name, String city, String state) {

    public static LocalityResponse from(Locality l) {
        return new LocalityResponse(l.getId(), l.getName(), l.getCity(), l.getState());
    }
}
