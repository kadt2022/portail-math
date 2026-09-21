package cd.portailmath.resources.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "portail-math.resources")
public record ResourceCatalogProperties(String libraryLocation, String gamesLocation) {

    public ResourceCatalogProperties {
        libraryLocation = normalize(libraryLocation, "classpath:/content/library/");
        gamesLocation = normalize(gamesLocation, "classpath:/content/games/");
    }

    private static String normalize(String location, String fallback) {
        String value = location == null || location.isBlank() ? fallback : location;
        return value.endsWith("/") ? value : value + "/";
    }
}
