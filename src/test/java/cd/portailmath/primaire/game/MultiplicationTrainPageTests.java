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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MultiplicationTrainPageTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void legacyGamesCatalogueRedirectsToReact() throws Exception {
        mockMvc.perform(get("/primaire/jeux"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/jeux"));
    }

    @Test
    void legacyMultiplicationTrainRedirectsToTheStaticShell() throws Exception {
        mockMvc.perform(get("/primaire/jeux/train-multiplications"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/games/multiplication-train.html"));
    }

    @Test
    void multiplicationTrainStaticShellIsAvailable() throws Exception {
        mockMvc.perform(get("/games/multiplication-train.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("data-multiplication-train")))
                .andExpect(content().string(containsString("Tables de 2 et 5")))
                .andExpect(content().string(containsString("data-game-console")))
                .andExpect(content().string(containsString("data-console-quit")))
                .andExpect(content().string(containsString("data-console-rotate")))
                .andExpect(content().string(not(containsString("data-start-game"))))
                .andExpect(content().string(not(containsString("Changer de niveau"))))
                .andExpect(content().string(containsString("/js/game-console.js")))
                .andExpect(content().string(containsString("/js/multiplication-train.js")))
                .andExpect(content().string(not(containsString("th:"))));
    }

    @Test
    void multiplicationTrainKeepsPlayingWhenLandscapeLockIsRefused() throws Exception {
        mockMvc.perform(get("/css/game-console.css"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(
                        "body.is-multiplication-train-immersive .game-console--train .game-console__body")))
                .andExpect(content().string(containsString(
                        "body.is-multiplication-train-immersive .game-console--train .game-console__rotate")))
                .andExpect(content().string(containsString("flex-direction: column")))
                .andExpect(content().string(not(containsString("rotate(90deg)"))));
    }

    @Test
    void unknownGameUsesClean404Page() throws Exception {
        mockMvc.perform(get("/primaire/jeux/inconnu"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(not(containsString("java.lang"))));
    }
}
