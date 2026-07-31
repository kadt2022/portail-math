package cd.portailmath.exetat.quiz.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class QuizApiTests {

    private static final Pattern QUIZ_ID_PATTERN = Pattern.compile("\"quizId\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void startsQuizAndNeverLeaksCorrectionBeforeValidation() throws Exception {
        String quizId = startQuiz("cercle");

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/current-question", quizId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questionNumber").value(1))
                .andExpect(jsonPath("$.totalQuestions").value(5))
                .andExpect(jsonPath("$.question.id").value("cercle-001"))
                .andExpect(jsonPath("$.question.choices.length()").value(4))
                .andExpect(jsonPath("$.question.correctChoiceId").doesNotExist())
                .andExpect(jsonPath("$.question.solution").doesNotExist())
                .andExpect(content().string(not(containsString("correctChoiceId"))))
                .andExpect(content().string(not(containsString("\"solution\""))));
    }

    @Test
    void returnsCorrectionAndBlocksDoubleValidation() throws Exception {
        String quizId = startQuiz("cercle");
        String answer = """
                {"questionId":"cercle-001","selectedChoiceId":"A"}
                """;

        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/answers", quizId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(answer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILURE"))
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.correctChoiceId").value("C"))
                .andExpect(jsonPath("$.solution.summary").isNotEmpty())
                .andExpect(jsonPath("$.score").value(0));

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/current-question", quizId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answered").value(true))
                .andExpect(jsonPath("$.answerResult.correct").value(false))
                .andExpect(jsonPath("$.answerResult.correctChoiceId").value("C"))
                .andExpect(jsonPath("$.answerResult.solution").exists());

        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/answers", quizId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(answer))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("QUESTION_ALREADY_ANSWERED"));
    }

    @Test
    void rejectsUnknownQuizAndInvalidChoice() throws Exception {
        mockMvc.perform(get("/api/v1/exetat/quizzes/00000000-0000-0000-0000-000000000000/current-question"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUIZ_NOT_FOUND"));

        String quizId = startQuiz("cercle");
        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/answers", quizId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionId":"cercle-001","selectedChoiceId":"Z"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ANSWER_CHOICE_NOT_FOUND"));
    }

    @Test
    void completesTheApiJourneyAndReturnsFinalResults() throws Exception {
        String quizId = startQuiz("cercle");
        List<String> questionIds = List.of(
                "cercle-001", "cercle-002", "cercle-004", "cercle-005", "cercle-008"
        );
        List<String> correctChoices = List.of("C", "A", "A", "C", "A");

        for (int index = 0; index < questionIds.size(); index++) {
            mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/answers", quizId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"questionId":"%s","selectedChoiceId":"%s"}
                                    """.formatted(questionIds.get(index), correctChoices.get(index))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.correct").value(true));

            if (index < questionIds.size() - 1) {
                mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/next", quizId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.currentQuestionNumber").value(index + 2));
            }
        }

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/result", quizId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("STANDARD"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.score").value(5))
                .andExpect(jsonPath("$.percentage").value(100))
                .andExpect(jsonPath("$.correctAnswers").value(5))
                .andExpect(jsonPath("$.failedQuestionIds.length()").value(0))
                .andExpect(jsonPath("$.appreciation").value("Excellent"));
    }

    @Test
    void createsAReviewContainingOnlyFailedQuestions() throws Exception {
        String sourceQuizId = startQuiz("cercle");
        completeQuiz(sourceQuizId, List.of("A", "A", "A", "C", "A"));

        String reviewResponse = mockMvc
                .perform(post("/api/v1/exetat/quizzes/{quizId}/reviews", sourceQuizId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceQuizId").value(sourceQuizId))
                .andExpect(jsonPath("$.mode").value("REVIEW"))
                .andExpect(jsonPath("$.totalQuestions").value(1))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String reviewQuizId = extractQuizId(reviewResponse);

        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/answers", reviewQuizId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionId":"cercle-001","selectedChoiceId":"C"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/result", reviewQuizId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("REVIEW"))
                .andExpect(jsonPath("$.sourceQuizId").value(sourceQuizId))
                .andExpect(jsonPath("$.correctedQuestionIds[0]").value("cercle-001"))
                .andExpect(jsonPath("$.failedQuestionIds.length()").value(0));
    }

    @Test
    void refusesReviewForUnknownUnfinishedOrPerfectQuiz() throws Exception {
        mockMvc.perform(post("/api/v1/exetat/quizzes/00000000-0000-0000-0000-000000000000/reviews"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUIZ_NOT_FOUND"));

        String unfinishedQuizId = startQuiz("cercle");
        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/reviews", unfinishedQuizId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("QUIZ_NOT_COMPLETED"));

        String perfectQuizId = startQuiz("cercle");
        completeQuiz(perfectQuizId, List.of("C", "A", "A", "C", "A"));
        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/reviews", perfectQuizId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_FAILED_QUESTIONS"));
    }

    private String startQuiz(String subjectId) throws Exception {
        String response = mockMvc.perform(post("/api/v1/exetat/quizzes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subjectId":"%s"}
                                """.formatted(subjectId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalQuestions").value(5))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return extractQuizId(response);
    }

    private String extractQuizId(String response) {
        Matcher matcher = QUIZ_ID_PATTERN.matcher(response);
        if (!matcher.find()) {
            throw new AssertionError("La réponse ne contient pas de quizId.");
        }
        return matcher.group(1);
    }

    private void completeQuiz(String quizId, List<String> selectedChoices) throws Exception {
        List<String> questionIds = List.of(
                "cercle-001", "cercle-002", "cercle-004", "cercle-005", "cercle-008"
        );
        for (int index = 0; index < questionIds.size(); index++) {
            mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/answers", quizId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"questionId":"%s","selectedChoiceId":"%s"}
                                    """.formatted(questionIds.get(index), selectedChoices.get(index))))
                    .andExpect(status().isOk());
            if (index < questionIds.size() - 1) {
                mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/next", quizId))
                        .andExpect(status().isOk());
            }
        }
    }
}
