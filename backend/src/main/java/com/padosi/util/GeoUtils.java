package com.padosi.util;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

/** Small helper for building PostGIS points. */
public final class GeoUtils {

    /** SRID 4326 = WGS84, the GPS coordinate system used by browsers and Google Maps. */
    public static final int SRID = 4326;

    private static final GeometryFactory FACTORY = new GeometryFactory(new PrecisionModel(), SRID);

    private GeoUtils() {
    }

    /**
     * Creates a Point from latitude/longitude.
     * JTS (like PostGIS) takes X = LONGITUDE first, then Y = LATITUDE.
     */
    public static Point point(double latitude, double longitude) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Invalid latitude/longitude");
        }
        return FACTORY.createPoint(new Coordinate(longitude, latitude));
    }
}
