package cd.portailmath.resources.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ResourceApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsTheResourcesTheFrontendCanUse() throws Exception {
        mockMvc.perform(get("/api/v1/resources"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.books.length()").value(3))
                .andExpect(jsonPath("$.books[0].id").value("math-primary-one"))
                .andExpect(jsonPath("$.books[0].titleKey").value("books.mathPrimaryOne.title"))
                .andExpect(jsonPath("$.books[0].pages").value(96))
                .andExpect(jsonPath("$.books[0].fileUrl")
                        .value("/api/v1/resources/books/math-primary-one/file"))
                .andExpect(jsonPath("$.gameQuestionBanks.length()").value(1))
                .andExpect(jsonPath("$.gameQuestionBanks[0].id").value("fraction-river"))
                .andExpect(jsonPath("$.gameQuestionBanks[0].dataUrl")
                        .value("/api/v1/resources/game-question-banks/fraction-river"))
                .andExpect(jsonPath("$.gameQuestionBanks[0].scriptUrl")
                        .value("/api/v1/resources/game-question-banks/fraction-river/script"));
    }

    @Test
    void returnsBookDetails() throws Exception {
        mockMvc.perform(get("/api/v1/resources/books/math-primary-three"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjectKey").value("books.mathPrimaryThree.subject"))
                .andExpect(jsonPath("$.fileUrl").value("/api/v1/resources/books/math-primary-three/file"));
    }

    @Test
    void reportsUnknownBook() throws Exception {
        mockMvc.perform(get("/api/v1/resources/books/math-primary-nine"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOOK_NOT_FOUND"))
                .andExpect(jsonPath("$.path").value("/api/v1/resources/books/math-primary-nine"));
    }

    @Test
    void deliversTheBookFileAsAnnouncedByTheCatalog() throws Exception {
        byte[] body = mockMvc.perform(get("/api/v1/resources/books/math-primary-one/file"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();

        assertThat(new String(body, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    @Test
    void servesOnlyTheRequestedSliceSoTheReaderCanLoadPageByPage() throws Exception {
        byte[] body = mockMvc.perform(get("/api/v1/resources/books/math-primary-one/file")
                        .header(HttpHeaders.RANGE, "bytes=0-1023"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();

        assertThat(body).hasSize(1024);
    }

    @Test
    void reportsUnknownBookFile() throws Exception {
        mockMvc.perform(get("/api/v1/resources/books/math-primary-nine/file"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOOK_NOT_FOUND"));
    }

    @Test
    void deliversTheGameQuestionBankWithoutReshapingIt() throws Exception {
        mockMvc.perform(get("/api/v1/resources/game-question-banks/fraction-river"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stepCount").value(5))
                .andExpect(jsonPath("$.stepTypes.length()").value(5))
                .andExpect(jsonPath("$.stepTypes[0]").value("IDENTIFY"))
                .andExpect(jsonPath("$.retiredStepTypes[0]").value("SELECT_PARTS"))
                .andExpect(jsonPath("$.allowedFractions.length()").value(6))
                .andExpect(jsonPath("$.bridgeFractions.length()").value(3))
                .andExpect(jsonPath("$.scenarios.length()").value(10))
                .andExpect(jsonPath("$.scenarios[0].id").value("S01"));
    }

    @Test
    void reportsUnknownQuestionBank() throws Exception {
        mockMvc.perform(get("/api/v1/resources/game-question-banks/multiplication-train"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUESTION_BANK_NOT_FOUND"));
    }

    @Test
    void servesTheSameBankAsAScriptForTheGameShell() throws Exception {
        String script = mockMvc.perform(get("/api/v1/resources/game-question-banks/fraction-river/script"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "text/javascript;charset=UTF-8"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(script)
                .contains("root.MbuyambaQuestionBanks[\"fraction-river\"]")
                .contains("\"S01\"")
                .doesNotContain("</");
    }

    @Test
    void reportsUnknownQuestionBankScript() throws Exception {
        mockMvc.perform(get("/api/v1/resources/game-question-banks/multiplication-train/script"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUESTION_BANK_NOT_FOUND"));
    }
}
