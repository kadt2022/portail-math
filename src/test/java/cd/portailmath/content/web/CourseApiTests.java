package cd.portailmath.content.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CourseApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsCoursesLoadedFromBackendResources() throws Exception {
        mockMvc.perform(get("/api/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("MATH-4P"))
                .andExpect(jsonPath("$[0].moduleCount").value(1))
                .andExpect(jsonPath("$[0].lessonCount").value(5));
    }

    @Test
    void returnsCourseDetails() throws Exception {
        mockMvc.perform(get("/api/v1/courses/MATH-4P"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("4e primaire"))
                .andExpect(jsonPath("$.modules[0].id").value("MATH-4P-U01"));
    }

    @Test
    void returnsModuleDetails() throws Exception {
        mockMvc.perform(get("/api/v1/courses/MATH-4P/modules/MATH-4P-U01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("MATH-4P-U01"))
                .andExpect(jsonPath("$.lessons[0].id").value("MATH-4P-U01-L01"));
    }

    @Test
    void returnsLessonWithoutEverLeakingCorrectAnswers() throws Exception {
        mockMvc.perform(get("/api/v1/courses/MATH-4P/lessons/MATH-4P-U01-L01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.u01l01.situation")
                        .value("Une coopérative compte 24 638 graines sélectionnées. Comment les compter facilement ?"))
                .andExpect(jsonPath("$.activities[0].data.textKey").value("content.u01l01.situation"))
                .andExpect(jsonPath("$.activities[2].exercises[0].id").value("u01l01-manipulate"))
                .andExpect(jsonPath("$.activities[2].exercises[0].type").value("place-value-build"))
                .andExpect(jsonPath("$.activities[2].exercises[0].data.targets[0]").value(24638))
                .andExpect(jsonPath("$.activities[5].exercises[0].serverData").doesNotExist())
                .andExpect(content().string(not(containsString("serverData"))))
                .andExpect(content().string(not(containsString("\"answer\""))));
    }

    @Test
    void returnsPedagogicalContentInTheRequestedLanguage() throws Exception {
        mockMvc.perform(get("/api/v1/courses/MATH-4P/lessons/MATH-4P-U01-L01").queryParam("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.u01l01.situation")
                        .value("A cooperative counts 24,638 selected seeds. How can they be counted easily?"))
                .andExpect(content().string(not(containsString("24 638 graines"))));
    }

    @Test
    void unknownNestedResourcesReturnStructuredErrors() throws Exception {
        mockMvc.perform(get("/api/v1/courses/MATH-4P/modules/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MODULE_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/courses/MATH-4P/lessons/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LESSON_NOT_FOUND"));
    }

    @Test
    void validatesScalarAndOrderedAnswersWithoutExposingExpectedAnswers() throws Exception {
        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/u01l01-reflect/answers")
                        .contentType("application/json")
                        .content("""
                                {"round":0,"answer":27053}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));

        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/u01l03-reflect/answers")
                        .contentType("application/json")
                        .content("""
                                {"round":0,"answer":[18520,80125,81025,81250]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));

        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/u01l03-reflect/answers")
                        .contentType("application/json")
                        .content("""
                                {"round":0,"answer":[81250,81025,80125,18520]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false));
    }

    @Test
    void validatesAnyAcceptedRangeAnswer() throws Exception {
        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/u01l03-check/answers")
                        .contentType("application/json")
                        .content("""
                                {"round":0,"answer":10000}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));

        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/u01l03-check/answers")
                        .contentType("application/json")
                        .content("""
                                {"round":0,"answer":9995}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false));
    }

    @Test
    void answerEndpointReturnsStructuredErrors() throws Exception {
        mockMvc.perform(post("/api/v1/courses/unknown/exercises/u01l01-reflect/answers")
                        .contentType("application/json")
                        .content("{\"answer\":27053}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/unknown/answers")
                        .contentType("application/json")
                        .content("{\"answer\":27053}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXERCISE_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/courses/MATH-4P/exercises/u01l01-reflect/answers")
                        .contentType("application/json")
                        .content("{\"round\":99,\"answer\":27053}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXERCISE_ANSWER"));
    }
}
