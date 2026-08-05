package cd.portailmath.primaire.game;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Page du jeu La Rivière des fractions.
 *
 * <p>Le catalogue {@code GET /primaire/jeux} reste servi par
 * {@link MultiplicationTrainPageController} : le déclarer ici aussi rendrait
 * le mapping ambigu au démarrage.</p>
 */
@Controller
@RequestMapping("/primaire/jeux")
public class FractionRiverPageController {

    @GetMapping("/riviere-des-fractions")
    public String fractionRiver(Model model) {
        model.addAttribute("pageTitle", "La Rivière des fractions");
        model.addAttribute("activePage", "games");
        // multiplication-train.css porte aujourd'hui le squelette commun des jeux
        // (barre d'outils, options, encouragements) : les deux feuilles sont chargées
        // en attendant son extraction vers un games-shell.css.
        model.addAttribute("pageStylesheets", java.util.List.of(
                "/css/multiplication-train.css",
                "/css/game-console.css",
                "/css/fraction-river.css"
        ));
        return "primaire/games/fraction-river";
    }
}
