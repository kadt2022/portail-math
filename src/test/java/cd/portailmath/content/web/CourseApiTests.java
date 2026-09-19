package cd.portailmath.content.web;

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
                .andExpect(jsonPath("$[0].id").value("demo-primary-four"))
                .andExpect(jsonPath("$[0].moduleCount").value(1))
                .andExpect(jsonPath("$[0].lessonCount").value(1));
    }

    @Test
    void returnsCourseDetails() throws Exception {
        mockMvc.perform(get("/api/v1/courses/demo-primary-four"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("4e primaire"))
                .andExpect(jsonPath("$.modules[0].id").value("numbers-foundation"));
    }

    @Test
    void returnsModuleDetails() throws Exception {
        mockMvc.perform(get("/api/v1/courses/demo-primary-four/modules/numbers-foundation"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("numbers-foundation"))
                .andExpect(jsonPath("$.lessons[0].id").value("place-value"));
    }

    @Test
    void returnsLessonWithoutEverLeakingCorrectAnswers() throws Exception {
        mockMvc.perform(get("/api/v1/courses/demo-primary-four/lessons/place-value"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activities[0].exercises[0].id").value("place-value-43-125"))
                .andExpect(jsonPath("$.activities[0].exercises[0].type").value("single-choice"))
                .andExpect(jsonPath("$.activities[0].exercises[0].data.prompt")
                        .value("Quelle est la valeur du chiffre 3 dans 43 125 ?"))
                .andExpect(jsonPath("$.activities[0].exercises[0].data.choices.length()").value(3))
                .andExpect(jsonPath("$.activities[0].exercises[0].serverData").doesNotExist())
                .andExpect(content().string(not(containsString("serverData"))))
                .andExpect(content().string(not(containsString("correctAnswer"))));
    }

    @Test
    void unknownNestedResourcesReturnStructuredErrors() throws Exception {
        mockMvc.perform(get("/api/v1/courses/demo-primary-four/modules/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MODULE_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/courses/demo-primary-four/lessons/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LESSON_NOT_FOUND"));
    }
}
