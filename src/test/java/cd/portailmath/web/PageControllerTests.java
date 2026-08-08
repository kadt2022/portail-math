package cd.portailmath.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PageControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicEntryRedirectsToReact() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/"));
    }

    @Test
    void exetatRedirectsToItsReactEquivalent() throws Exception {
        mockMvc.perform(get("/exetat"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat"));
    }

    @Test
    void primaryPageRedirectsToTheReactGamesCatalogue() throws Exception {
        mockMvc.perform(get("/primaire"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/jeux"));
    }

    @Test
    void aboutPageRedirectsToItsReactEquivalent() throws Exception {
        mockMvc.perform(get("/a-propos"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/a-propos"));
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
