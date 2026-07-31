package cd.portailmath.exetat.quiz.application;

import java.util.UUID;

public interface QuizService {

    QuizStarted startQuiz(String subjectId);

    QuizStarted startReview(UUID sourceQuizId);

    CurrentQuestion getCurrentQuestion(UUID quizId);

    AnswerResult submitAnswer(UUID quizId, String questionId, String selectedChoiceId);

    QuizProgress moveToNextQuestion(UUID quizId);

    QuizResult getResult(UUID quizId);
}
