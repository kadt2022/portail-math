package cd.portailmath.exetat.quiz.application;

public class QuizException extends RuntimeException {

    private final QuizErrorCode code;

    public QuizException(QuizErrorCode code) {
        super(code.getMessage());
        this.code = code;
    }

    public QuizErrorCode getCode() {
        return code;
    }
}

