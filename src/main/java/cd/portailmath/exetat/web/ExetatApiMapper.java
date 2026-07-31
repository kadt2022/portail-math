package cd.portailmath.exetat.web;

import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.web.response.AnswerChoiceResponse;
import cd.portailmath.exetat.web.response.PublicQuestionResponse;
import cd.portailmath.exetat.web.response.SubjectDetailResponse;
import cd.portailmath.exetat.web.response.SubjectSummaryResponse;
import org.springframework.stereotype.Component;

@Component
public class ExetatApiMapper {

    public SubjectSummaryResponse toSummary(ExetatSubject subject) {
        return new SubjectSummaryResponse(
                subject.id(),
                subject.name(),
                subject.category(),
                subject.description(),
                subject.icon(),
                subject.questionCount(),
                subject.topics().size(),
                subject.estimatedMinutes(),
                subject.difficulties().stream().map(Enum::name).toList(),
                subject.status().name()
        );
    }

    public SubjectDetailResponse toDetail(ExetatSubject subject) {
        return new SubjectDetailResponse(
                subject.id(),
                subject.name(),
                subject.category(),
                subject.description(),
                subject.icon(),
                subject.questionCount(),
                subject.estimatedMinutes(),
                subject.topics(),
                subject.difficulties().stream().map(Enum::name).toList(),
                subject.status().name()
        );
    }

    public PublicQuestionResponse toPublicQuestion(Question question) {
        return new PublicQuestionResponse(
                question.id(),
                question.subjectId(),
                question.topic(),
                question.difficulty().name(),
                question.statement(),
                question.choices().stream()
                        .map(choice -> new AnswerChoiceResponse(choice.id(), choice.label()))
                        .toList(),
                question.points()
        );
    }
}

