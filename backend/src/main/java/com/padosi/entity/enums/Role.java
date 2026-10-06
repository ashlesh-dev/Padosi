package com.padosi.entity.enums;

/** Stored in the database as text (@Enumerated(EnumType.STRING)), never as a number. */
public enum Role {
    USER, ADMIN
    // More roles (e.g. SOCIETY_ADMIN) can be added here later; the DB column has no CHECK.
}

