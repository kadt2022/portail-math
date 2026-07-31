package cd.portailmath.exetat.quiz.application;

public enum QuizErrorCode {
    QUIZ_NOT_FOUND("La tentative demandée est introuvable."),
    SUBJECT_NOT_FOUND("La matière demandée est introuvable."),
    QUESTION_NOT_CURRENT("Cette question n’est pas la question active."),
    QUESTION_ALREADY_ANSWERED("Une réponse a déjà été validée pour cette question."),
    ANSWER_CHOICE_NOT_FOUND("Le choix sélectionné est invalide."),
    CURRENT_QUESTION_NOT_ANSWERED("Réponds à la question avant de continuer."),
    QUIZ_NOT_COMPLETED("Le résultat sera disponible après la dernière question."),
    QUIZ_ALREADY_COMPLETED("Cette tentative est déjà terminée."),
    NO_FAILED_QUESTIONS("Toutes les réponses de cette tentative sont correctes."),
    SOURCE_QUIZ_NOT_FOUND("La tentative d’origine n’est plus disponible.");

    private final String message;

    QuizErrorCode(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
