package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.quiz.application.AnswerResult;
import cd.portailmath.exetat.quiz.application.QuizProgress;
import cd.portailmath.exetat.quiz.application.QuizResult;
import cd.portailmath.exetat.quiz.application.QuizService;
import cd.portailmath.exetat.quiz.application.QuizStarted;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exetat/quizzes")
public class QuizApiController {

    private final QuizService quizService;

    public QuizApiController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping
    public ResponseEntity<QuizStarted> start(@RequestBody StartQuizRequest request) {
        QuizStarted started = quizService.startQuiz(request.subjectId());
        return ResponseEntity
                .created(URI.create("/api/v1/exetat/quizzes/" + started.quizId()))
                .body(started);
    }

    @PostMapping("/{quizId}/reviews")
    public ResponseEntity<QuizStarted> review(@PathVariable UUID quizId) {
        QuizStarted started = quizService.startReview(quizId);
        return ResponseEntity
                .created(URI.create("/api/v1/exetat/quizzes/" + started.quizId()))
                .body(started);
    }

    @GetMapping("/{quizId}/current-question")
    public CurrentQuestionResponse currentQuestion(@PathVariable UUID quizId) {
        return QuizApiMapper.toResponse(quizService.getCurrentQuestion(quizId));
    }

    @PostMapping("/{quizId}/answers")
    public AnswerResultResponse answer(
            @PathVariable UUID quizId,
            @RequestBody SubmitAnswerRequest request
    ) {
        AnswerResult result = quizService.submitAnswer(
                quizId,
                request.questionId(),
                request.selectedChoiceId()
        );
        return QuizApiMapper.toResponse(result);
    }

    @PostMapping("/{quizId}/next")
    public QuizProgress next(@PathVariable UUID quizId) {
        return quizService.moveToNextQuestion(quizId);
    }

    @GetMapping("/{quizId}/result")
    public QuizResult result(@PathVariable UUID quizId) {
        return quizService.getResult(quizId);
    }
}
