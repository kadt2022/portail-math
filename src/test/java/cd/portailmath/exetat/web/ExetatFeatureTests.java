package cd.portailmath.exetat.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ExetatFeatureTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void legacyCatalogueRedirectsToReact() throws Exception {
        mockMvc.perform(get("/exetat"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat"));
    }

    @Test
    void legacySubjectRedirectsToItsReactEquivalent() throws Exception {
        mockMvc.perform(get("/exetat/matieres/cercle"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat/matieres/cercle"));
    }

    @Test
    void unknownSubjectStillKeepsItsDeepReactRoute() throws Exception {
        mockMvc.perform(get("/exetat/matieres/inconnue"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat/matieres/inconnue"));
    }

    @Test
    void legacyTrainingRedirectsToItsReactEquivalent() throws Exception {
        mockMvc.perform(get("/exetat/matieres/derivees/entrainement"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat/matieres/derivees/entrainement"));
    }

    @Test
    void subjectsApiReturnsFourSubjects() throws Exception {
        mockMvc.perform(get("/api/v1/exetat/matieres"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].id").value("cercle"));
    }

    @Test
    void subjectApiReturnsCircleDetails() throws Exception {
        mockMvc.perform(get("/api/v1/exetat/matieres/cercle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("cercle"))
                .andExpect(jsonPath("$.questionCount").value(5));
    }

    @Test
    void publicQuestionsApiNeverLeaksAnswersOrSolutions() throws Exception {
        mockMvc.perform(get("/api/v1/exetat/matieres/cercle/questions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].correctChoiceId").doesNotExist())
                .andExpect(jsonPath("$[0].solution").doesNotExist())
                .andExpect(content().string(not(containsString("correctChoiceId"))))
                .andExpect(content().string(not(containsString("\"solution\""))));
    }

    @Test
    void unknownSubjectApiReturnsStructuredError() throws Exception {
        mockMvc.perform(get("/api/v1/exetat/matieres/inconnue"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SUBJECT_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("La matière demandée est introuvable."))
                .andExpect(jsonPath("$.path").value("/api/v1/exetat/matieres/inconnue"));
    }
}
