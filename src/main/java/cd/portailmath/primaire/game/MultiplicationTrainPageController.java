package cd.portailmath.primaire.game;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/primaire/jeux")
public class MultiplicationTrainPageController {

    @GetMapping
    public String games(Model model) {
        model.addAttribute("pageTitle", "Jeux éducatifs");
        model.addAttribute("activePage", "games");
        model.addAttribute("pageStylesheet", "/css/multiplication-train.css");
        return "primaire/games/catalogue";
    }

    @GetMapping("/train-multiplications")
    public String multiplicationTrain(Model model) {
        model.addAttribute("pageTitle", "Le Train des multiplications");
        model.addAttribute("activePage", "games");
        model.addAttribute("pageStylesheet", "/css/multiplication-train.css");
        return "primaire/games/multiplication-train";
    }
}
