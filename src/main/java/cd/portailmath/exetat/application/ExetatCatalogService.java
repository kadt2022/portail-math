package cd.portailmath.exetat.application;

import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;

import java.util.List;
import java.util.Optional;

public interface ExetatCatalogService {

    List<ExetatSubject> findAllSubjects();

    Optional<ExetatSubject> findSubjectById(String subjectId);

    List<Question> findQuestionsBySubject(String subjectId);

    Optional<Question> findQuestionById(String subjectId, String questionId);
}

