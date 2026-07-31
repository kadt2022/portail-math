package cd.portailmath.exetat.quiz.domain;

import java.time.Instant;

public record QuizAnswer(
        String questionId,
        String selectedChoiceId,
        String correctChoiceId,
        boolean correct,
        int earnedPoints,
        Instant answeredAt
) {
}

