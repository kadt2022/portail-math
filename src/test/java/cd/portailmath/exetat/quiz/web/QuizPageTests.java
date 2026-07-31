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
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

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
    void rendersInteractiveQuizPage() throws Exception {
        mockMvc.perform(get("/exetat/matieres/cercle/quiz"))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/quiz"))
                .andExpect(content().string(containsString("data-quiz-root")))
                .andExpect(content().string(containsString("/js/exetat-quiz.js")))
                .andExpect(content().string(containsString("Correction immédiate")));
    }

    @Test
    void resultPageIsUnavailableBeforeCompletion() throws Exception {
        QuizStarted started = quizService.startQuiz("cercle");

        mockMvc.perform(get("/exetat/quizzes/{quizId}/resultats", started.quizId()))
                .andExpect(status().isConflict())
                .andExpect(view().name("exetat/resultats"))
                .andExpect(content().string(containsString("Résultats indisponibles")));
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

        mockMvc.perform(get("/exetat/quizzes/{quizId}/resultats", started.quizId()))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/resultats"))
                .andExpect(content().string(containsString("Excellent")))
                .andExpect(content().string(containsString("100%")))
                .andExpect(content().string(containsString("Recommencer ce quiz")))
                .andExpect(content().string(not(containsString("Revoir mes erreurs"))));
    }

    @Test
    void rendersReviewActionWhenCompletedQuizHasErrors() throws Exception {
        QuizStarted started = completeQuizWithFirstAnswerWrong();

        mockMvc.perform(get("/exetat/quizzes/{quizId}/resultats", started.quizId()))
                .andExpect(status().isOk())
                .andExpect(view().name("exetat/resultats"))
                .andExpect(content().string(containsString("Revoir mes erreurs")))
                .andExpect(content().string(containsString("/js/quiz-result.js")));
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

        mockMvc.perform(get("/exetat/quizzes/{quizId}/resultats", review.quizId()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Révision terminée")))
                .andExpect(content().string(containsString("erreurs corrigées")))
                .andExpect(content().string(containsString("Ma progression")));
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
