package cd.portailmath.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
class PageControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void dashboardIsAvailable() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"))
                .andExpect(content().string(containsString("Mbuyamba Maths")));
    }

    @Test
    void exetatPageIsAvailable() throws Exception {
        mockMvc.perform(get("/exetat"))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/catalogue"));
    }

    @Test
    void primairePageIsAvailable() throws Exception {
        mockMvc.perform(get("/primaire"))
                .andExpect(status().isOk())
                .andExpect(view().name("primaire"));
    }

    @Test
    void aboutPageIsAvailable() throws Exception {
        mockMvc.perform(get("/a-propos"))
                .andExpect(status().isOk())
                .andExpect(view().name("a-propos"));
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void openshiftProbesAreUp() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));

        mockMvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
