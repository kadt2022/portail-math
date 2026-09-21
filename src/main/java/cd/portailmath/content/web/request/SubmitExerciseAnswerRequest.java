package cd.portailmath.content.web.request;

public record SubmitExerciseAnswerRequest(
        Integer round,
        Object answer
) {
}
