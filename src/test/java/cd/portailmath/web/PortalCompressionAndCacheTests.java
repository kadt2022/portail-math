package cd.portailmath.web;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * LEO-PERF-02, étape 1 : la compression est vérifiée sur une vraie réponse HTTP du serveur embarqué, pas seulement
 * dans la configuration. Le client Java ne décompresse rien de lui-même : on voit les octets réellement transférés.
 *
 * <p>Chantier A (Turbo Pulse) : chaque catégorie de réponse a sa propre règle de cache, vérifiée ici sur de vraies
 * réponses. Fichiers versionnés : un an, immuables. Document HTML et routes React : revalidés à chaque visite. API :
 * jamais gardées.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PortalCompressionAndCacheTests {

    /** Nom produit par Vite : base, tiret, empreinte du contenu (8 caractères), extension. */
    private static final Pattern VERSIONED_NAME = Pattern.compile("^.+-[A-Za-z0-9_-]{8}\\.[a-z0-9]+$");

    @LocalServerPort
    private int port;

    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<byte[]> get(String path, String acceptEncoding) throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET();
        if (acceptEncoding != null) {
            request.header("Accept-Encoding", acceptEncoding);
        }
        return client.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
    }

    private String cacheControl(String path) throws IOException, InterruptedException {
        return get(path, null).headers().firstValue("Cache-Control").orElse("");
    }

    /** Fichiers réellement produits par Vite et empaquetés sous static/app/assets. */
    private static List<String> builtAssetNames() throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver().getResources("classpath:/static/app/assets/*");
        return Arrays.stream(resources).map(Resource::getFilename).toList();
    }

    @Test
    void portalShellIsGzippedWhenTheBrowserAcceptsIt() throws Exception {
        HttpResponse<byte[]> plain = get("/app/index.html", null);
        HttpResponse<byte[]> gzipped = get("/app/index.html", "gzip, br");

        assertThat(plain.statusCode()).isEqualTo(200);
        assertThat(plain.headers().firstValue("Content-Encoding")).isEmpty();
        assertThat(gzipped.statusCode()).isEqualTo(200);
        assertThat(gzipped.headers().firstValue("Content-Encoding")).contains("gzip");
        // Moins d'octets transférés, et le même document une fois décompressé.
        assertThat(gzipped.body().length).isLessThan(plain.body().length);
        String inflated = new String(new GZIPInputStream(new ByteArrayInputStream(gzipped.body())).readAllBytes(), StandardCharsets.UTF_8);
        assertThat(inflated).isEqualTo(new String(plain.body(), StandardCharsets.UTF_8));
    }

    @Test
    void everyBuiltAssetCarriesAContentHashInItsName() throws Exception {
        // Condition du cache d'un an : l'adresse doit changer avec le contenu. Un fichier sans empreinte ici serait
        // gardé un an sans jamais être renouvelé.
        List<String> names = builtAssetNames();
        assertThat(names).isNotEmpty();
        assertThat(names).allSatisfy(name -> assertThat(name).matches(VERSIONED_NAME));
    }

    @Test
    void versionedAssetsAreCachedForAYearAndNeverRevalidated() throws Exception {
        String asset = builtAssetNames().stream().filter(name -> name.endsWith(".js")).findFirst().orElseThrow();
        HttpResponse<byte[]> response = get("/app/assets/" + asset, null);
        assertThat(response.statusCode()).isEqualTo(200);
        String header = response.headers().firstValue("Cache-Control").orElse("");
        assertThat(header).contains("max-age=31536000").contains("public").contains("immutable");
        assertThat(header).doesNotContain("no-store").doesNotContain("no-cache");
    }

    @Test
    void aMissingVersionedAssetIsA404AndNeverTheHtmlShell() throws Exception {
        HttpResponse<byte[]> missing = get("/app/assets/absent-ABCDEFGH.webp", null);
        assertThat(missing.statusCode()).isEqualTo(404);
        assertThat(new String(missing.body(), StandardCharsets.UTF_8)).doesNotContain("<div id=\"root\">");
        assertThat(missing.headers().firstValue("Cache-Control").orElse("")).doesNotContain("immutable");
    }

    @Test
    void htmlDocumentAndReactRoutesAreRevalidatedOnEveryVisit() throws Exception {
        for (String path : List.of("/app/index.html", "/app/jeux/turbo-pulse", "/app/jeux/conduire-avec-leo")) {
            String header = cacheControl(path);
            assertThat(header).as(path).contains("no-cache");
            assertThat(header).as(path).doesNotContain("max-age=31536000").doesNotContain("immutable");
        }
        // Une route React reçoit bien le document HTML (repli), avec la même règle.
        HttpResponse<byte[]> route = get("/app/jeux/turbo-pulse", null);
        assertThat(route.statusCode()).isEqualTo(200);
        assertThat(route.headers().firstValue("Content-Type").orElse("")).startsWith("text/html");
    }

    @Test
    void apiResponsesAreNeverStoredAndNotCompressed() throws Exception {
        HttpResponse<byte[]> api = get("/api/v1/courses", "gzip, br");
        assertThat(api.statusCode()).isEqualTo(200);
        assertThat(api.headers().firstValue("Content-Encoding")).isEmpty();
        assertThat(api.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        // Même une adresse d'API inconnue n'est jamais gardée.
        assertThat(cacheControl("/api/v1/inconnu")).contains("no-store");
    }
}
