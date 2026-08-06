package cd.portailmath.primaire.game;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

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
    public String fractionRiver(@RequestParam(name = "mode", required = false) String mode, Model model) {
        model.addAttribute("pageTitle", "La Rivière des fractions");
        model.addAttribute("activePage", "games");
        model.addAttribute("immersiveMode", true);
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

    /**
     * Prototype de calibrage des trois couches : illustration, canvas Phaser
     * transparent, question HTML.
     *
     * <p>Page de diagnostic, servie à côté du jeu et non à sa place : la version
     * en primitives reste intacte tant que l'illustration propre n'est pas
     * validée. Le fond est une maquette de travail, non versionnée — voir
     * {@code docs/art-direction/fraction-river/README.md}.</p>
     */
    @GetMapping("/riviere-des-fractions/prototype-v2")
    public String fractionRiverPrototype(Model model) {
        model.addAttribute("pageTitle", "Prototype de calibrage — La Rivière des fractions");
        model.addAttribute("activePage", "games");
        model.addAttribute("pageStylesheets", java.util.List.of(
                "/css/multiplication-train.css",
                "/css/game-console.css",
                // Indispensable, et pas seulement pour l'apparence : les visuels
                // de fractions sont des SVG dont les parts sont peintes par
                // .fr-part et .fr-hatch-*. Sans cette feuille, chaque disque
                // retombe sur le remplissage noir par défaut du SVG.
                "/css/fraction-river.css",
                "/css/fraction-river-v2.css"
        ));
        return "primaire/games/fraction-river-prototype";
    }
}
