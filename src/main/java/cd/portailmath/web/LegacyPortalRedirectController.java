package cd.portailmath.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Redirections de compatibilité des URL publiques antérieures au portail React.
 * Ce contrôleur ne rend aucune vue serveur.
 */
@Controller
public class LegacyPortalRedirectController {

    @GetMapping("/")
    public String portal() {
        return "redirect:/app/";
    }

    @GetMapping({"/primaire", "/primaire/jeux"})
    public String primaryAndGames() {
        return "redirect:/app/jeux";
    }

    @GetMapping("/progression")
    public String progression() {
        return "redirect:/app/progression";
    }

    @GetMapping("/a-propos")
    public String about() {
        return "redirect:/app/a-propos";
    }

    @GetMapping("/exetat")
    public String exetat() {
        return "redirect:/app/exetat";
    }

    @GetMapping("/exetat/matieres/{subjectId}")
    public String exetatSubject(@PathVariable String subjectId) {
        return "redirect:/app/exetat/matieres/" + subjectId;
    }

    @GetMapping("/exetat/matieres/{subjectId}/entrainement")
    public String exetatTraining(@PathVariable String subjectId) {
        return "redirect:/app/exetat/matieres/" + subjectId + "/entrainement";
    }

    @GetMapping("/exetat/matieres/{subjectId}/quiz")
    public String exetatQuiz(@PathVariable String subjectId) {
        return "redirect:/app/exetat/matieres/" + subjectId + "/quiz";
    }

    @GetMapping("/exetat/quizzes/{quizId}/resultats")
    public String exetatResults(@PathVariable String quizId) {
        return "redirect:/app/exetat/quizzes/" + quizId + "/resultats";
    }

    @GetMapping("/primaire/jeux/train-multiplications")
    public String multiplicationTrain() {
        return "redirect:/games/multiplication-train.html";
    }

    @GetMapping("/primaire/jeux/riviere-des-fractions")
    public String fractionRiver() {
        return "redirect:/games/fraction-river.html";
    }

    @GetMapping("/primaire/jeux/riviere-des-fractions/prototype-v2")
    public String fractionRiverPrototype() {
        return "redirect:/games/fraction-river-prototype.html";
    }
}
