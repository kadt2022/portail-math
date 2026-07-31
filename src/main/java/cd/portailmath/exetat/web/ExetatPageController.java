package cd.portailmath.exetat.web;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.quiz.application.QuizErrorCode;
import cd.portailmath.exetat.quiz.application.QuizException;
import cd.portailmath.exetat.quiz.application.QuizResult;
import cd.portailmath.exetat.quiz.application.QuizService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

@Controller
public class ExetatPageController {

    private final ExetatCatalogService catalogService;
    private final QuizService quizService;

    public ExetatPageController(ExetatCatalogService catalogService, QuizService quizService) {
        this.catalogService = catalogService;
        this.quizService = quizService;
    }

    @GetMapping("/exetat")
    public String catalogue(Model model) {
        List<ExetatSubject> subjects = catalogService.findAllSubjects();
        addCommonAttributes(model, "Catalogue EXETAT");
        model.addAttribute("subjects", subjects);
        model.addAttribute("totalQuestionCount",
                subjects.stream().mapToInt(ExetatSubject::questionCount).sum());
        return "exetat/catalogue";
    }

    @GetMapping("/exetat/matieres/{subjectId}")
    public String subject(
            @PathVariable String subjectId,
            Model model,
            HttpServletResponse response
    ) {
        return catalogService.findSubjectById(subjectId)
                .map(subject -> {
                    addCommonAttributes(model, subject.name());
                    model.addAttribute("subject", subject);
                    model.addAttribute("sampleTopics", catalogService.findQuestionsBySubject(subjectId).stream()
                            .map(Question::topic)
                            .distinct()
                            .limit(4)
                            .toList());
                    return "exetat/matiere";
                })
                .orElseGet(() -> notFound(model, response));
    }

    @GetMapping("/exetat/matieres/{subjectId}/entrainement")
    public String training(
            @PathVariable String subjectId,
            Model model,
            HttpServletResponse response
    ) {
        return catalogService.findSubjectById(subjectId)
                .map(subject -> {
                    addCommonAttributes(model, "Entraînement — " + subject.name());
                    model.addAttribute("subject", subject);
                    return "exetat/entrainement";
                })
                .orElseGet(() -> notFound(model, response));
    }

    @GetMapping("/exetat/matieres/{subjectId}/quiz")
    public String quiz(
            @PathVariable String subjectId,
            Model model,
            HttpServletResponse response
    ) {
        return catalogService.findSubjectById(subjectId)
                .map(subject -> {
                    addCommonAttributes(model, "Quiz — " + subject.name());
                    model.addAttribute("subject", subject);
                    return "exetat/quiz";
                })
                .orElseGet(() -> notFound(model, response));
    }

    @GetMapping("/exetat/quizzes/{quizId}/resultats")
    public String results(
            @PathVariable UUID quizId,
            Model model,
            HttpServletResponse response
    ) {
        addCommonAttributes(model, "Résultats du quiz");
        try {
            QuizResult result = quizService.getResult(quizId);
            model.addAttribute("resultAvailable", true);
            model.addAttribute("result", result);
        } catch (QuizException exception) {
            model.addAttribute("resultAvailable", false);
            model.addAttribute("resultMessage", exception.getMessage());
            response.setStatus(exception.getCode() == QuizErrorCode.QUIZ_NOT_FOUND
                    ? HttpServletResponse.SC_NOT_FOUND
                    : HttpServletResponse.SC_CONFLICT);
        }
        return "exetat/resultats";
    }

    private String notFound(Model model, HttpServletResponse response) {
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        addCommonAttributes(model, "Matière introuvable");
        return "exetat/introuvable";
    }

    private void addCommonAttributes(Model model, String pageTitle) {
        model.addAttribute("pageTitle", pageTitle);
        model.addAttribute("activePage", "exetat");
    }
}
