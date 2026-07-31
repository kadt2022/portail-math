package cd.portailmath.exetat.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "portail-math.exetat")
public record ExetatCatalogProperties(
        String contentLocation,
        int expectedQuestionsPerSubject
) {
    public ExetatCatalogProperties {
        if (contentLocation == null || contentLocation.isBlank()) {
            contentLocation = "classpath:/content/exetat/";
        }
        if (!contentLocation.endsWith("/")) {
            contentLocation = contentLocation + "/";
        }
        if (expectedQuestionsPerSubject <= 0) {
            expectedQuestionsPerSubject = 10;
        }
    }
}
