package cd.portailmath.progress;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;

@SpringBootTest
@AutoConfigureMockMvc
class ProgressPageTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void legacyProgressPageRedirectsToReact() throws Exception {
        mockMvc.perform(get("/progression"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/progression"));
    }

    @Test
    void unknownRouteUsesClean404Page() throws Exception {
        mockMvc.perform(get("/route-inconnue"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        containsString("java.lang")
                )));
    }
}
