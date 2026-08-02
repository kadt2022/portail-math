package cd.portailmath.primaire.game;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
class FractionRiverPageTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void gamesCatalogueAnnouncesFractionRiver() throws Exception {
        mockMvc.perform(get("/primaire/jeux"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("La Rivière des fractions")))
                .andExpect(content().string(containsString("/primaire/jeux/riviere-des-fractions")));
    }

    @Test
    void fractionRiverPageIsAvailable() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions"))
                .andExpect(status().isOk())
                .andExpect(view().name("primaire/games/fraction-river"))
                .andExpect(content().string(containsString("data-fraction-river")))
                .andExpect(content().string(containsString("Le Gué des parts")))
                .andExpect(content().string(containsString("/js/fraction-river.js")));
    }

    @Test
    void fractionRiverLevelsTwoAndThreeStayAnnounced() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Les Nénuphars équivalents")))
                .andExpect(content().string(containsString("Les Rapides du calcul")))
                .andExpect(content().string(containsString("Bientôt disponible")));
    }

    @Test
    void unknownFractionRiverSubPathUsesClean404Page() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions/inconnu"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("Page introuvable")))
                .andExpect(content().string(not(containsString("java.lang"))));
    }
}
