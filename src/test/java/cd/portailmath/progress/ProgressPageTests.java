package cd.portailmath.progress;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
class ProgressPageTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rendersProgressPageWithFourSubjects() throws Exception {
        mockMvc.perform(get("/progression"))
                .andExpect(status().isOk())
                .andExpect(view().name("progression"))
                .andExpect(content().string(containsString("Ma progression")))
                .andExpect(content().string(containsString("data-progress-subject=\"cercle\"")))
                .andExpect(content().string(containsString("data-progress-subject=\"droite\"")))
                .andExpect(content().string(containsString("data-progress-subject=\"derivees\"")))
                .andExpect(content().string(containsString("data-progress-subject=\"integrales\"")))
                .andExpect(content().string(containsString("/js/progress-store.js")));
    }

    @Test
    void unknownRouteUsesClean404Page() throws Exception {
        mockMvc.perform(get("/route-inconnue"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("Page introuvable")))
                .andExpect(content().string(containsString("Retour au dashboard")))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        containsString("java.lang")
                )));
    }
}
