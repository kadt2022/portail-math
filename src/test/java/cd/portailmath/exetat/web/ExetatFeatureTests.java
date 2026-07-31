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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
class ExetatFeatureTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void catalogueShowsAllSubjects() throws Exception {
        mockMvc.perform(get("/exetat"))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/catalogue"))
                .andExpect(content().string(containsString("Le cercle")))
                .andExpect(content().string(containsString("La droite")))
                .andExpect(content().string(containsString("Les dérivées")))
                .andExpect(content().string(containsString("Les intégrales")));
    }

    @Test
    void circleDetailShowsSubjectData() throws Exception {
        mockMvc.perform(get("/exetat/matieres/cercle"))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/matiere"))
                .andExpect(content().string(containsString("Le cercle")))
                .andExpect(content().string(containsString("5")))
                .andExpect(content().string(containsString("Commencer l’entraînement")));
    }

    @Test
    void unknownSubjectShowsCleanNotFoundPage() throws Exception {
        mockMvc.perform(get("/exetat/matieres/inconnue"))
                .andExpect(status().isNotFound())
                .andExpect(view().name("exetat/introuvable"))
                .andExpect(content().string(containsString("Matière introuvable")));
    }

    @Test
    void trainingPreviewShowsRules() throws Exception {
        mockMvc.perform(get("/exetat/matieres/derivees/entrainement"))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/entrainement"))
                .andExpect(content().string(containsString("Les règles du quiz")))
                .andExpect(content().string(containsString("Commencer les 5 questions")));
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
