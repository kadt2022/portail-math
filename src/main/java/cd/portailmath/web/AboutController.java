package cd.portailmath.web;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AboutController {

    @GetMapping("/a-propos")
    public String about(Model model) {
        model.addAttribute("pageTitle", "À propos");
        model.addAttribute("activePage", "about");
        return "a-propos";
    }
}

