package cd.portailmath.exetat.domain;

import java.util.List;

public record ExetatSubject(
        String id,
        String name,
        String category,
        String description,
        String icon,
        int questionCount,
        int estimatedMinutes,
        List<String> topics,
        List<Difficulty> difficulties,
        SubjectStatus status
) {
    public ExetatSubject {
        topics = topics == null ? List.of() : List.copyOf(topics);
        difficulties = difficulties == null ? List.of() : List.copyOf(difficulties);
    }

    public ExetatSubject withQuestionCount(int count) {
        return new ExetatSubject(
                id,
                name,
                category,
                description,
                icon,
                count,
                estimatedMinutes,
                topics,
                difficulties,
                status
        );
    }
}

