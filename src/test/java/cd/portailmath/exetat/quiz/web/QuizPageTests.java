package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.quiz.application.AnswerResult;
import cd.portailmath.exetat.quiz.application.CurrentQuestion;
import cd.portailmath.exetat.quiz.application.QuizService;
import cd.portailmath.exetat.quiz.application.QuizStarted;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class QuizPageTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private QuizService quizService;

    @Autowired
    private ExetatCatalogService catalogService;

    @Test
    void legacyQuizRouteRedirectsAndApiStartsTheInteractiveQuiz() throws Exception {
        mockMvc.perform(get("/exetat/matieres/cercle/quiz"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat/matieres/cercle/quiz"));

        mockMvc.perform(post("/api/v1/exetat/quizzes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subjectId":"cercle"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subjectId").value("cercle"))
                .andExpect(jsonPath("$.totalQuestions").value(5))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void resultPageIsUnavailableBeforeCompletion() throws Exception {
        QuizStarted started = quizService.startQuiz("cercle");

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/result", started.quizId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("QUIZ_NOT_COMPLETED"));

        mockMvc.perform(get("/exetat/quizzes/{quizId}/resultats", started.quizId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/app/exetat/quizzes/" + started.quizId() + "/resultats"));
    }

    @Test
    void rendersCompletedQuizResults() throws Exception {
        QuizStarted started = quizService.startQuiz("cercle");
        for (int index = 0; index < 5; index++) {
            CurrentQuestion current = quizService.getCurrentQuestion(started.quizId());
            Question question = catalogService
                    .findQuestionById("cercle", current.question().id())
                    .orElseThrow();
            AnswerResult answer = quizService.submitAnswer(
                    started.quizId(),
                    question.id(),
                    question.correctChoiceId()
            );
            if (answer.hasNextQuestion()) {
                quizService.moveToNextQuestion(started.quizId());
            }
        }

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/result", started.quizId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appreciation").value("Excellent"))
                .andExpect(jsonPath("$.percentage").value(100))
                .andExpect(jsonPath("$.failedQuestionIds.length()").value(0));
    }

    @Test
    void rendersReviewActionWhenCompletedQuizHasErrors() throws Exception {
        QuizStarted started = completeQuizWithFirstAnswerWrong();

        mockMvc.perform(post("/api/v1/exetat/quizzes/{quizId}/reviews", started.quizId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("REVIEW"))
                .andExpect(jsonPath("$.sourceQuizId").value(started.quizId().toString()))
                .andExpect(jsonPath("$.totalQuestions").value(1));
    }

    @Test
    void rendersReviewResultSeparatelyFromNormalScore() throws Exception {
        QuizStarted source = completeQuizWithFirstAnswerWrong();
        QuizStarted review = quizService.startReview(source.quizId());
        CurrentQuestion current = quizService.getCurrentQuestion(review.quizId());
        quizService.submitAnswer(
                review.quizId(),
                current.question().id(),
                current.question().correctChoiceId()
        );

        mockMvc.perform(get("/api/v1/exetat/quizzes/{quizId}/result", review.quizId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("REVIEW"))
                .andExpect(jsonPath("$.sourceQuizId").value(source.quizId().toString()))
                .andExpect(jsonPath("$.correctedQuestionIds.length()").value(1))
                .andExpect(jsonPath("$.failedQuestionIds.length()").value(0));
    }

    private QuizStarted completeQuizWithFirstAnswerWrong() {
        QuizStarted started = quizService.startQuiz("cercle");
        for (int index = 0; index < 5; index++) {
            CurrentQuestion current = quizService.getCurrentQuestion(started.quizId());
            Question question = current.question();
            String selectedChoiceId = index == 0
                    ? question.choices().stream()
                    .map(choice -> choice.id())
                    .filter(choiceId -> !choiceId.equals(question.correctChoiceId()))
                    .findFirst()
                    .orElseThrow()
                    : question.correctChoiceId();
            AnswerResult answer = quizService.submitAnswer(
                    started.quizId(),
                    question.id(),
                    selectedChoiceId
            );
            if (answer.hasNextQuestion()) {
                quizService.moveToNextQuestion(started.quizId());
            }
        }
        return started;
    }
}
