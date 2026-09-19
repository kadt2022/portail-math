package cd.portailmath.content.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "portail-math.courses")
public record CourseCatalogProperties(String contentLocation) {

    public CourseCatalogProperties {
        if (contentLocation == null || contentLocation.isBlank()) {
            contentLocation = "classpath:/content/courses/";
        }
        if (!contentLocation.endsWith("/")) {
            contentLocation = contentLocation + "/";
        }
    }
}
