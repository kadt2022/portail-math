package cd.portailmath.web;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * LEO-PERF-02, étape 1 : la compression est vérifiée sur une vraie réponse HTTP du serveur embarqué, pas seulement
 * dans la configuration. Le client Java ne décompresse rien de lui-même : on voit les octets réellement transférés.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PortalCompressionAndCacheTests {

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
    void portalResourcesAreNeverStoredByTheBrowser() throws Exception {
        assertThat(get("/app/index.html", null).headers().firstValue("Cache-Control")).contains("no-store");
        assertThat(get("/app/jeux/conduire-avec-leo", null).headers().firstValue("Cache-Control")).contains("no-store");
    }

    @Test
    void apiResponsesKeepTheirOwnHeadersAndAreNotCompressed() throws Exception {
        HttpResponse<byte[]> api = get("/api/v1/inconnu", "gzip, br");
        assertThat(api.headers().firstValue("Content-Encoding")).isEmpty();
        assertThat(api.headers().firstValue("Cache-Control").orElse("")).doesNotContain("no-store");
    }
}
