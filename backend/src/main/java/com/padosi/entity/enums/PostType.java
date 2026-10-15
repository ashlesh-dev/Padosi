package com.padosi.entity.enums;

/** Stored in the database as text (@Enumerated(EnumType.STRING)), never as a number. */
public enum PostType {
    GENERAL, ANNOUNCEMENT, QUESTION, RECOMMENDATION,
    /** Legacy feed value still present on posts created before alerts were split out. */
    EMERGENCY_ALERT
}
