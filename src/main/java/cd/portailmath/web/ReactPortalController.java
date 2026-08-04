package cd.portailmath.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Point d'entrée du portail React.
 *
 * <p>Le gestionnaire de ressources couvre {@code /app/**} ; il reste à traiter
 * l'adresse exacte {@code /app}, sans barre finale, que les enfants et les
 * enseignants taperont naturellement.</p>
 */
@Controller
public class ReactPortalController {

    @GetMapping({"/app", "/app/"})
    public String portalEntryPoint() {
        return "forward:/app/index.html";
    }
}
