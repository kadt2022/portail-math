package cd.portailmath.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ReactPortalTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void portalEntryPointForwardsToTheShell() throws Exception {
        // MockMvc n'exécute pas le transfert, il l'enregistre : on vérifie donc
        // la cible, et le contenu servi est contrôlé par le test suivant.
        mockMvc.perform(get("/app"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/app/index.html"));
    }

    @Test
    void portalShellIsServedFromTheJar() throws Exception {
        mockMvc.perform(get("/app/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("id=\"root\"")))
                // Les ressources produites par Vite sont préfixées par /app/ :
                // sans cela elles seraient introuvables une fois empaquetées.
                .andExpect(content().string(containsString("/app/assets/")));
    }

    @Test
    void unknownPortalRouteFallsBackToTheReactShell() throws Exception {
        mockMvc.perform(get("/app/une-route-inconnue"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("id=\"root\"")));

        mockMvc.perform(get("/app/jeux"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("id=\"root\"")));

        mockMvc.perform(get("/app/progression"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("id=\"root\"")));

        mockMvc.perform(get("/app/exetat/matieres/cercle"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("id=\"root\"")));
    }

    @Test
    void apiNeverFallsBackToTheReactShell() throws Exception {
        mockMvc.perform(get("/api/v1/inconnu"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/v1/inconnu"))
                .andExpect(content().string(not(containsString("id=\"root\""))));
    }

    @Test
    void actuatorKeepsAnsweringJson() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"status\":\"UP\"")))
                .andExpect(content().string(not(containsString("id=\"root\""))));
    }

    @Test
    void publicEntryPointsRedirectToReact() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().is3xxRedirection());

        mockMvc.perform(get("/primaire/jeux"))
                .andExpect(status().is3xxRedirection());
    }
}
