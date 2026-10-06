package com.padosi.entity.enums;

/** Stored in the database as text (@Enumerated(EnumType.STRING)), never as a number. */
public enum AlertType {
    MEDICAL, FIRE, SAFETY, WEATHER, UTILITY, OTHER
}

