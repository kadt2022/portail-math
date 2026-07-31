package cd.portailmath.progress;

import cd.portailmath.exetat.application.ExetatCatalogService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ProgressPageController {

    private final ExetatCatalogService catalogService;

    public ProgressPageController(ExetatCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/progression")
    public String progression(Model model) {
        model.addAttribute("pageTitle", "Ma progression");
        model.addAttribute("activePage", "progress");
        model.addAttribute("subjects", catalogService.findAllSubjects());
        return "progression";
    }
}
