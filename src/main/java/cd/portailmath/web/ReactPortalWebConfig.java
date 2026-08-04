package cd.portailmath.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Sert le portail React construit par Vite sous {@code /app/**}.
 *
 * <p>Le repli vers {@code index.html} est indispensable : sans lui, actualiser
 * une route interne comme {@code /app/bibliotheque} renverrait une 404, car
 * aucun fichier de ce nom n'existe.</p>
 *
 * <p>Le repli est délibérément porté par le gestionnaire de ressources et non
 * par un contrôleur attrape-tout. Ainsi il ne s'applique qu'à {@code /app/**} :
 * {@code /api/**} et {@code /actuator/**} ne peuvent pas se voir répondre du
 * HTML à la place de leur JSON, et les vrais fichiers produits par Vite
 * continuent d'être servis normalement.</p>
 */
@Configuration
public class ReactPortalWebConfig implements WebMvcConfigurer {

    static final String PORTAL_LOCATION = "classpath:/static/app/";
    static final String PORTAL_INDEX = "/static/app/index.html";

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/app/**")
                .addResourceLocations(PORTAL_LOCATION)
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location)
                            throws IOException {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        return new ClassPathResource(PORTAL_INDEX);
                    }
                });
    }
}
