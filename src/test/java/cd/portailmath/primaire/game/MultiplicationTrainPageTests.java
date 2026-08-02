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
class MultiplicationTrainPageTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void gamesCatalogueIsAvailable() throws Exception {
        mockMvc.perform(get("/primaire/jeux"))
                .andExpect(status().isOk())
                .andExpect(view().name("primaire/games/catalogue"))
                .andExpect(content().string(containsString("Le Train des multiplications")))
                .andExpect(content().string(containsString("Jouer maintenant")));
    }

    @Test
    void multiplicationTrainIsAvailable() throws Exception {
        mockMvc.perform(get("/primaire/jeux/train-multiplications"))
                .andExpect(status().isOk())
                .andExpect(view().name("primaire/games/multiplication-train"))
                .andExpect(content().string(containsString("data-multiplication-train")))
                .andExpect(content().string(containsString("Tables de 2 et 5")))
                .andExpect(content().string(containsString("/js/multiplication-train.js")));
    }

    @Test
    void unknownGameUsesClean404Page() throws Exception {
        mockMvc.perform(get("/primaire/jeux/inconnu"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("Page introuvable")))
                .andExpect(content().string(not(containsString("java.lang"))));
    }
}
