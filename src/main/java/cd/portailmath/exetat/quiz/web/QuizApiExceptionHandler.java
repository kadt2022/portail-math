package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.quiz.application.QuizErrorCode;
import cd.portailmath.exetat.quiz.application.QuizException;
import cd.portailmath.exetat.web.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = QuizApiController.class)
public class QuizApiExceptionHandler {

    @ExceptionHandler(QuizException.class)
    public ResponseEntity<ApiErrorResponse> handle(
            QuizException exception,
            HttpServletRequest request
    ) {
        HttpStatus status = switch (exception.getCode()) {
            case QUIZ_NOT_FOUND, SUBJECT_NOT_FOUND, SOURCE_QUIZ_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ANSWER_CHOICE_NOT_FOUND -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.CONFLICT;
        };
        return ResponseEntity
                .status(status)
                .body(new ApiErrorResponse(
                        exception.getCode().name(),
                        exception.getMessage(),
                        request.getRequestURI()
                ));
    }
}
