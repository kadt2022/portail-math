package cd.portailmath.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.time.Duration;

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
 *
 * <p>Politique de cache (évolution de la doctrine V1 décidée par le Capitaine, chantier A de Turbo Pulse) :</p>
 * <ul>
 *   <li>{@code /app/assets/**} : fichiers produits par Vite, tous nommés avec l'empreinte de leur contenu
 *   (« niv001-BAiIBx0j.webp »). Un contenu nouveau a donc toujours une adresse nouvelle : le navigateur peut garder ces
 *   fichiers un an sans jamais servir une version périmée. Pas de repli vers {@code index.html} ici : un fichier absent
 *   répond 404, sinon une page HTML pourrait rester un an en cache sous l'adresse d'une image.</li>
 *   <li>Le reste de {@code /app/**} (document HTML et routes React) : {@code no-cache}. Le navigateur peut garder la
 *   page, mais la revalide à chaque visite (réponse 304 minuscule si rien n'a changé) : une nouvelle version du jeu,
 *   qui référence de nouveaux noms de fichiers, est donc prise immédiatement.</li>
 *   <li>Les API ({@code /api/**}) restent en {@code no-store} : voir {@link ApiCacheConfig}.</li>
 * </ul>
 * <p>Ni Service Worker, ni stockage hors ligne : seul le cache HTTP standard du navigateur est utilisé.</p>
 */
@Configuration
public class ReactPortalWebConfig implements WebMvcConfigurer {

    static final String PORTAL_LOCATION = "classpath:/static/app/";
    static final String PORTAL_INDEX = "/static/app/index.html";
    static final String VERSIONED_ASSETS_LOCATION = PORTAL_LOCATION + "assets/";
    /** Un an : la durée maximale conventionnelle pour un fichier dont l'adresse change avec le contenu. */
    static final Duration VERSIONED_ASSETS_MAX_AGE = Duration.ofDays(365);

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Fichiers versionnés : gardés un an, jamais revalidés ; un fichier absent répond 404 (aucun repli HTML).
        registry.addResourceHandler("/app/assets/**")
                .addResourceLocations(VERSIONED_ASSETS_LOCATION)
                .setCacheControl(CacheControl.maxAge(VERSIONED_ASSETS_MAX_AGE).cachePublic().immutable())
                .resourceChain(true)
                .addResolver(new PathResourceResolver());

        // Document HTML et routes React : revalidés à chaque visite.
        registry.addResourceHandler("/app/**")
                .addResourceLocations(PORTAL_LOCATION)
                .setCacheControl(CacheControl.noCache())
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
