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
                .andExpect(content().string(containsString("/primaire/jeux/riviere-des-fractions?mode=immersive")))
                .andExpect(content().string(containsString("data-fraction-river-direct-launch")))
                .andExpect(content().string(containsString("/js/fraction-river-launch.js")))
                .andExpect(content().string(containsString("Jouer <span")));
    }

    @Test
    void fractionRiverPageIsAvailable() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions"))
                .andExpect(status().isOk())
                .andExpect(view().name("primaire/games/fraction-river"))
                .andExpect(content().string(containsString("data-fraction-river")))
                .andExpect(content().string(containsString("/js/fraction-river.js")))
                .andExpect(content().string(containsString("is-fraction-river-immersive")))
                .andExpect(content().string(not(containsString("Jouer en grand"))))
                .andExpect(content().string(not(containsString("data-game-setup"))))
                .andExpect(content().string(not(containsString("data-start-game"))));
    }

    @Test
    void fractionRiverImmersiveRouteKeepsDirectLaunchContract() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions?mode=immersive"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("data-game-console")))
                .andExpect(content().string(containsString("is-fraction-river-immersive")))
                .andExpect(content().string(containsString("Tourne ton téléphone pour jouer.")))
                .andExpect(content().string(not(containsString("data-console-launch"))));
    }

    @Test
    void fractionRiverStaticAssetsKeepImmersiveLaunchNonBlocking() throws Exception {
        mockMvc.perform(get("/js/fraction-river.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("mode\") !== \"immersive"))))
                .andExpect(content().string(containsString("startGame();")))
                .andExpect(content().string(containsString("gameConsole.enter();")));

        mockMvc.perform(get("/js/game-console.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("keepImmersiveOnFullscreenExit")))
                .andExpect(content().string(containsString("demanderPleinEcran()")))
                .andExpect(content().string(containsString("verrouillerPaysage()")));

        mockMvc.perform(get("/css/game-console.css"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("body.is-fraction-river-immersive .sidebar")))
                .andExpect(content().string(containsString("body.is-fraction-river-immersive .topbar")))
                .andExpect(content().string(containsString("body.is-fraction-river-immersive .game-console--single .game-console__rotate")))
                .andExpect(content().string(containsString("rotate(90deg)")));

        mockMvc.perform(get("/js/fraction-river-launch.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("requestFullscreen")))
                .andExpect(content().string(containsString("orientation.lock(\"landscape\")")))
                // Le jeu reste dans le document qui a reçu le clic : une
                // navigation annulerait le plein écran et le paysage.
                .andExpect(content().string(containsString("createLaunchSurface")))
                .andExpect(content().string(containsString("document.createElement(\"iframe\")")))
                .andExpect(content().string(containsString("requestFullscreen(overlay)")))
                .andExpect(content().string(not(containsString("root.location.href = url"))));

        mockMvc.perform(get("/js/fraction-river.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("fraction-river:exit")))
                .andExpect(content().string(containsString("root.parent.postMessage")));
    }

    @Test
    void fractionRiverLevelPickerDoesNotInterruptLaunch() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("Quel passage veux-tu emprunter ?"))))
                .andExpect(content().string(not(containsString("Les Nénuphars équivalents"))))
                .andExpect(content().string(not(containsString("Les Rapides du calcul"))))
                .andExpect(content().string(not(containsString("Changer de niveau"))));
    }

    @Test
    void phaserIsServedLocallyAndPinnedByVersion() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/js/vendor/phaser-3.90.0.min.js")))
                .andExpect(content().string(containsString("fraction-river-game.js")))
                // Aucun script ni style ne doit provenir d'un tiers : le mode hors
                // connexion et le déploiement OpenShift n'en dépendent jamais.
                .andExpect(content().string(not(containsString("cdn."))))
                .andExpect(content().string(not(containsString("unpkg."))))
                .andExpect(content().string(not(containsString("//cdnjs"))));
    }

    @Test
    void questionsStayInAccessibleHtmlOutsideTheCanvas() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions"))
                .andExpect(status().isOk())
                // La scène Phaser est décorative et masquée aux lecteurs d'écran.
                .andExpect(content().string(containsString("id=\"fraction-river-game\"")))
                // Question, réponses et correction restent du HTML annoncé.
                .andExpect(content().string(containsString("data-step-options")))
                .andExpect(content().string(containsString("data-step-feedback")))
                .andExpect(content().string(containsString("aria-live=\"polite\"")));
    }

    @Test
    void unknownFractionRiverSubPathUsesClean404Page() throws Exception {
        mockMvc.perform(get("/primaire/jeux/riviere-des-fractions/inconnu"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("Page introuvable")))
                .andExpect(content().string(not(containsString("java.lang"))));
    }
}
