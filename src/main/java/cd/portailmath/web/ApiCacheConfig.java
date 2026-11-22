package cd.portailmath.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.WebContentInterceptor;

/**
 * Réponses des API : jamais gardées par le navigateur ni par un intermédiaire ({@code no-store}). Elles peuvent
 * contenir la progression ou les résultats d'un élève. Séparée de {@link ReactPortalWebConfig}, qui ne concerne que les
 * fichiers du portail : chaque catégorie a sa règle, aucune n'est appliquée à l'aveugle à tout le site.
 */
@Configuration
public class ApiCacheConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        WebContentInterceptor noStore = new WebContentInterceptor();
        noStore.addCacheMapping(CacheControl.noStore(), "/api/**");
        registry.addInterceptor(noStore).addPathPatterns("/api/**");
    }
}
