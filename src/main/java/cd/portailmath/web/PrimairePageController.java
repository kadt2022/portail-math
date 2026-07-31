package cd.portailmath.web;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PrimairePageController {

    @GetMapping("/primaire")
    public String primaire(Model model) {
        model.addAttribute("pageTitle", "Maths du primaire");
        model.addAttribute("activePage", "primaire");
        return "primaire";
    }
}

