# Padosi - Project Context

## 1. Project Overview and Goal
**Padosi** (Pados se Phechan) is a full-stack college project. It is a hyperlocal community platform and social network designed specifically for Indian neighborhoods. The primary feature is that users only see content, alerts, services, and marketplace items from people living within 5-10 km of their location.

## 2. Tech Stack and Versions
*   **Frontend**: React + Vite, React Router DOM, Axios
*   **Backend**: Java 17+, Spring Boot (3.5.16), Spring Web (REST), Spring Data JPA, Hibernate Spatial, Spring Security + JWT, Lombok
*   **Database**: PostgreSQL hosted on Supabase with the **PostGIS** extension enabled
*   **Storage**: Supabase Public Buckets (for images, URLs stored in DB)

## 3. Folder Structure
*   `/backend/` - Spring Boot Java backend
    *   `/src/main/java/com/padosi/` - Base package
        *   `config/` - Spring Security, CORS, and general configurations
        *   `controller/` - REST API endpoints
        *   `dto/` - Data Transfer Objects for API requests/responses
        *   `entity/` - JPA Entities mapping to PostgreSQL tables
        *   `exception/` - Global exception handlers
        *   `repository/` - Spring Data JPA repositories (includes spatial queries)
        *   `service/` - Business logic and JWT utilities
        *   `util/` - Utilities (e.g., PostGIS point creation)
*   `/frontend/` - React + Vite frontend
    *   `src/api/` - Axios configuration and interceptors
    *   `src/context/` - React context providers (e.g., `AuthContext`)
    *   `src/pages/` - React page components
    *   `src/styles.css` - Global CSS theme variables and styling
*   `/database/` - Database scripts
    *   `schema.sql` - Complete schema, indexes, PostGIS setup, and seed data

## 4. Design Decisions
*   **Spatial Queries over Simple Distances**: We strictly use PostGIS `GEOGRAPHY(Point, 4326)` for exact coordinates and `ST_DWithin` for 5-10 km radius filtering. 
*   **Privacy & Location**: Exact coordinates are never exposed to the frontend or other users. The API only returns the locality name and city.
*   **Manual Locality Fallback**: If browser Geolocation fails, users select a manual locality from a dropdown, and the backend uses the center coordinates of that locality.
*   **BIGINT IDs**: We use `BIGSERIAL` (Long) for primary keys instead of UUIDs for simpler queries, easier readability, and slightly better indexing performance for a college project.
*   **Supabase Role**: Supabase is *only* used as a managed PostgreSQL database and a storage bucket. We do not use Supabase Auth or Supabase APIs; we handle auth manually via Spring Security and JWT.
*   **Roles**: Simplified to just `USER` and `ADMIN` inside the users table.

## 5. Rules to Follow
*   **Design**: Do not change the frontend color theme. The original HTML structure, `styles.css` and CSS variables (`--ink`, `--teal`, `--orange`, etc.) must be reused for all new React pages.
*   **Simplicity**: Keep code simple, layered, and adequately commented as this is a college project. Do not over-engineer.
*   **Secrets**: Never hardcode secrets, passwords, or keys in the code. Always use `.env` files and `.gitignore`.
*   **Dependencies**: Avoid adding unnecessary third-party libraries unless absolutely required.

## 6. Current Status
*   **Completed**:
    *   Step 1: Database Schema design (13 tables) and PostGIS configuration (`database/schema.sql`).
    *   Step 2: Backend setup (Entities, Repositories, PostGIS integration).
    *   Step 3: Authentication APIs (JWT generation, BCrypt hashing, Login/Register endpoints).
    *   Step 4: Frontend scaffolding (React, Vite, Router, Axios, AuthContext, Home, Login, Register, Profile pages).
    *   Step 5 (Community Feed): Full Instagram-style feed with likes, comments, radius filtering, and pagination.
        *   **Backend**: `GET /api/posts` (paginated, radius-filtered, returns likeCount/commentCount/likedByMe/distanceKm), `POST /api/posts`, `DELETE /api/posts/{id}`, `POST /api/posts/{id}/like` (toggle), `GET /api/posts/{id}/comments`, `POST /api/posts/{id}/comments`.
        *   **Frontend**: `Feed.jsx` redesigned — create post box (modal-style), radius pills (1/5/10 km), Instagram-style `PostCard` with optimistic like toggle + rollback, expandable inline comments, skeleton loaders, empty state, Load More pagination.
        *   `PostType` enum extended with `QUESTION` and `RECOMMENDATION`.
        *   `PostResponse` DTO extended with `likeCount`, `commentCount`, `likedByMe`, `distanceKm`, `authorId`, `imageUrl`.
        *   Image URL field is **temporary**: users paste a URL; real Supabase Storage uploads deferred to Step 6.
*   **Next Step**: Step 6 — Image uploads via Supabase Storage for posts and profiles.

## 7. Remaining Roadmap
*   **Step 6**: Image uploads (Integrating Supabase Storage bucket for posts/profiles — replace the temp URL field with a real file picker).
*   **Step 7**: Radius-filtered APIs/UI for Marketplace, Services, and Alerts tabs.
*   **Step 8**: User Search & Profile viewing.
*   **Step 9**: Testing and polishing.

## 8. How to Run
**Prerequisites**: Java 17+, Maven, Node.js, and a running Supabase project.

**Backend**:
1. Navigate to `/backend`
2. Create a `.env` file in the `backend/` root with:
   * `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   * `JWT_SECRET` (generate a random 32+ char string)
3. Run: `.\mvnw.cmd spring-boot:run` (Server runs on port 8080)

**Frontend**:
1. Navigate to `/frontend`
2. Install dependencies (if not already done): `npm install`
3. Run: `npm run dev` (Runs on port 5173)

## 9. Known Issues and Pending Assumptions
*   **BOM Characters**: The project initially suffered from UTF-8 BOM characters in Java files causing Maven compile errors. These must be stripped if they recur.
*   **Lost & Found**: Assumed to be categorized under the `Alert` entity (with a type of `LOST` or `FOUND`), avoiding the need for a separate table.
*   **Sample Localities**: `schema.sql` contains a few mock localities (e.g., Andheri, Bandra) for the fallback functionality. More extensive data loading for localities is assumed to be out of scope or done manually later.
