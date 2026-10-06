package com.padosi.dto;

/** Returned after a successful register/login. The frontend sends the token as "Authorization: Bearer <token>". */
public record AuthResponse(String token, String tokenType, UserResponse user) {

    public static AuthResponse of(String token, UserResponse user) {
        return new AuthResponse(token, "Bearer", user);
    }
}
