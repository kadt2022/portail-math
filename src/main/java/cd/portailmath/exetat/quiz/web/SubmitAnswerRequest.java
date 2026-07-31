package cd.portailmath.exetat.quiz.web;

public record SubmitAnswerRequest(
        String questionId,
        String selectedChoiceId
) {
}
