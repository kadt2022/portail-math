import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "../app/AppRouter";
import type { CourseDefinition } from "../courses/course-engine/course-model";
import { evaluation, lesson, plannedModule } from "../courses/course-engine/course-scaffold";
import { completeLearningStep, createEmptyCourseProgress } from "../courses/course-engine/course-progress";
import { resetSessionCourseProgress, setSessionCourseProgress } from "../courses/course-engine/useCourseProgress";
import { PRIMARY_FOUR_COURSE } from "../courses/primary-four/course-catalogue";
import { i18next } from "../i18n/i18n";
import { READER_COURSES } from "./reader-courses";
import { readerCourseFromDefinition, type ReaderCourse } from "./reader-model";
import { ReaderShell } from "./ReaderShell";

const PREFIX = "TEST-R-U";
const FIRST = `${PREFIX}01`;

// Deux parcours de test de tailles différentes : le lecteur ne doit rien supposer sur le nombre de modules.
function fixtureCourse(extraPlanned: number): ReaderCourse {
  const definition: CourseDefinition = {
    id: `TEST-R${extraPlanned}`,
    basePath: "/apprentissages/test/mathematiques",
    plannedLessonCount: 2,
    modules: [
      {
        id: FIRST,
        number: 1,
        titleKey: "modules.m1.title",
        illustration: "1",
        publication: "available",
        plannedLessonCount: 2,
        lessons: [lesson(FIRST, 1, "lessons.l1.title"), lesson(FIRST, 2, "lessons.l2.title")],
        evaluation: evaluation(FIRST),
      },
      ...Array.from({ length: extraPlanned }, (_, index) =>
        plannedModule(PREFIX, index + 2, `modules.m${index + 2}.title`, "·"),
      ),
    ],
  };
  return readerCourseFromDefinition(definition, "primaryFour");
}

function CurrentPath() {
  const { pathname } = useLocation();
  return <p data-testid="path">{pathname}</p>;
}

function renderShell(course: ReaderCourse, path = course.basePath) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ReaderShell course={course} />}>
          <Route path="*" element={<CurrentPath />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const titleOf = (key: string) => i18next.t(`primaryFour:${key}`);
const outline = () => screen.getByRole("navigation", { name: "Sommaire du cours" });

describe("Lecteur pédagogique", () => {
  beforeEach(async () => {
    cleanup();
    localStorage.clear();
    resetSessionCourseProgress();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = "";
  });

  describe("menu des modules", () => {
    it.each([2, 6])("affiche « Bien démarrer » et les %i modules prévus plus le premier, sans nombre figé", (extra) => {
      const course = fixtureCourse(extra);
      renderShell(course);

      const links = within(outline()).getAllByRole("link");
      expect(links).toHaveLength(course.modules.length + 1);
      expect(links[0]).toHaveTextContent("Bien démarrer");
      expect(links[1]).toHaveTextContent(titleOf("modules.m1.title"));
      expect(links.at(-1)).toHaveTextContent(titleOf(`modules.m${extra + 1}.title`));
    });

    it("marque « Bien démarrer » comme page courante sur la page d'accueil du cours", () => {
      const course = fixtureCourse(2);
      renderShell(course);

      expect(within(outline()).getByRole("link", { name: /Bien démarrer/ })).toHaveAttribute("aria-current", "page");
    });

    it("signale les modules à venir et déplie les leçons du module affiché", () => {
      const course = fixtureCourse(2);
      renderShell(course, course.modules[0].path);

      const nav = outline();
      expect(within(nav).getByRole("link", { name: new RegExp(titleOf("modules.m1.title")) })).toHaveAttribute(
        "aria-current",
        "page",
      );
      const lessons = within(nav).getByRole("list", { name: "Leçons du module 1" });
      expect(within(lessons).getAllByRole("link")).toHaveLength(3);
      expect(within(nav).getAllByText("À venir")).toHaveLength(2);
    });

    it("change de module sans recharger : le contenu et le module actif suivent", async () => {
      const user = userEvent.setup();
      const course = fixtureCourse(2);
      renderShell(course);

      await user.click(within(outline()).getByRole("link", { name: new RegExp(titleOf("modules.m2.title")) }));

      expect(screen.getByTestId("path")).toHaveTextContent(course.modules[1].path);
      expect(within(outline()).getByRole("link", { name: new RegExp(titleOf("modules.m2.title")) })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(within(outline()).getByRole("link", { name: /Bien démarrer/ })).not.toHaveAttribute("aria-current");
    });

    it("se parcourt au clavier : chaque entrée est un lien accessible par Tab", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      const first = within(outline()).getAllByRole("link")[0];
      first.focus();
      await user.tab();

      expect(document.activeElement).toBe(within(outline()).getAllByRole("link")[1]);
    });
  });

  describe("navigation entre les modules", () => {
    it("propose seulement « Suivant » sur la page d'accueil du cours", () => {
      const course = fixtureCourse(2);
      renderShell(course);

      const nav = screen.getByRole("navigation", { name: "Navigation entre les modules" });
      expect(within(nav).queryByRole("link", { name: /Précédent/ })).not.toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /Suivant/ })).toHaveAttribute("href", course.modules[0].path);
    });

    it("propose les deux sens au milieu du parcours et passe au module suivant", async () => {
      const user = userEvent.setup();
      const course = fixtureCourse(2);
      renderShell(course, course.modules[1].path);

      const nav = screen.getByRole("navigation", { name: "Navigation entre les modules" });
      expect(within(nav).getByRole("link", { name: /Précédent/ })).toHaveAttribute("href", course.modules[0].path);

      await user.click(within(nav).getByRole("link", { name: /Suivant/ }));
      expect(screen.getByTestId("path")).toHaveTextContent(course.modules[2].path);
    });

    it("n'offre plus « Suivant » sur le dernier module", () => {
      const course = fixtureCourse(2);
      renderShell(course, course.modules[2].path);

      const nav = screen.getByRole("navigation", { name: "Navigation entre les modules" });
      expect(within(nav).queryByRole("link", { name: /Suivant/ })).not.toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: /Précédent/ })).toBeInTheDocument();
    });
  });

  describe("recherche", () => {
    it("s'ouvre par le bouton, trouve un module sans tenir compte des accents et y mène", async () => {
      const user = userEvent.setup();
      const course = fixtureCourse(2);
      renderShell(course);

      await user.click(screen.getByRole("button", { name: "Rechercher dans le cours" }));
      const dialog = screen.getByRole("dialog", { name: "Rechercher dans le cours" });
      expect(within(dialog).getByRole("searchbox")).toHaveFocus();

      await user.type(within(dialog).getByRole("searchbox"), "additionner");
      await user.click(within(dialog).getByRole("link", { name: new RegExp(titleOf("modules.m2.title")) }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("path")).toHaveTextContent(course.modules[1].path);
    });

    it("trouve une leçon par son titre et indique le module concerné", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      await user.click(screen.getByRole("button", { name: "Rechercher dans le cours" }));
      await user.type(screen.getByRole("searchbox"), "valeur de position");

      const result = screen.getByRole("link", { name: /Valeur de position/ });
      expect(result).toHaveTextContent("Module 1");
    });

    it("annonce l'absence de résultat", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      await user.click(screen.getByRole("button", { name: "Rechercher dans le cours" }));
      await user.type(screen.getByRole("searchbox"), "zzzzzz");

      expect(screen.getByRole("status")).toHaveTextContent("Aucun résultat");
    });

    it("s'ouvre avec « / » et Ctrl+K, et se ferme avec Échap en rendant le focus au bouton", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      await user.keyboard("/");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rechercher dans le cours" })).toHaveFocus();

      await user.keyboard("{Control>}k{/Control}");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ne détourne pas la touche « / » quand on écrit dans le champ de recherche", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      await user.keyboard("/");
      await user.type(screen.getByRole("searchbox"), "a/b");

      expect(screen.getByRole("searchbox")).toHaveValue("a/b");
    });
  });

  describe("thème, menu mobile et langue", () => {
    it("bascule entre clair et sombre sans rien écrire dans le stockage du navigateur", async () => {
      const user = userEvent.setup();
      const write = vi.spyOn(Storage.prototype, "setItem");
      const { container } = renderShell(fixtureCourse(2));
      const root = container.firstElementChild as HTMLElement;

      expect(root).toHaveAttribute("data-theme", "light");
      await user.click(screen.getByRole("button", { name: "Activer le thème sombre" }));
      expect(root).toHaveAttribute("data-theme", "dark");
      expect(screen.getByRole("button", { name: "Activer le thème clair" })).toHaveAttribute("aria-pressed", "true");

      await user.click(within(outline()).getAllByRole("link")[1]);
      await user.click(screen.getByRole("button", { name: "Rechercher dans le cours" }));
      await user.keyboard("{Escape}");

      expect(write).not.toHaveBeenCalled();
    });

    // Le bouton du sommaire est masqué par le CSS en largeur « bureau » : on le cible par son libellé.
    it("ouvre et ferme le sommaire mobile, verrouille le défilement et réagit à Échap", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));
      const toggle = screen.getByLabelText("Ouvrir le sommaire");

      expect(toggle).toHaveAttribute("aria-expanded", "false");
      await user.click(toggle);
      expect(screen.getAllByLabelText("Fermer le sommaire")[0]).toHaveAttribute("aria-expanded", "true");
      expect(document.body.style.overflow).toBe("hidden");

      await user.keyboard("{Escape}");
      expect(screen.getByLabelText("Ouvrir le sommaire")).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByLabelText("Ouvrir le sommaire")).toHaveFocus();
      expect(document.body.style.overflow).toBe("");
    });

    it("referme le sommaire mobile après le choix d'un module", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      await user.click(screen.getByLabelText("Ouvrir le sommaire"));
      await user.click(within(outline()).getAllByRole("link")[1]);

      expect(screen.getByLabelText("Ouvrir le sommaire")).toHaveAttribute("aria-expanded", "false");
    });

    it("permet de revenir au portail depuis la marque", () => {
      renderShell(fixtureCourse(2));

      expect(screen.getByRole("link", { name: /Retour au portail Mbuyamba/ })).toHaveAttribute("href", "/");
    });

    it("traduit les libellés du lecteur quand la langue change", async () => {
      const user = userEvent.setup();
      renderShell(fixtureCourse(2));

      await user.click(screen.getByRole("button", { name: /^English$/ }));

      expect(screen.getByRole("navigation", { name: "Course outline" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search the course" })).toBeInTheDocument();
    });
  });

  describe("progression affichée", () => {
    it("indique 0 % sans progression enregistrée", () => {
      renderShell(readerCourseFromDefinition(PRIMARY_FOUR_COURSE, "primaryFour"));

      const bar = screen.getByRole("progressbar", { name: "Progression du cours" });
      expect(bar).toHaveAttribute("aria-valuenow", "0");
    });

    it("relit la progression déjà stockée sur l'appareil, sans jamais l'écrire", () => {
      const course = readerCourseFromDefinition(PRIMARY_FOUR_COURSE, "primaryFour");
      const firstLesson = PRIMARY_FOUR_COURSE.modules[0].lessons[0];
      let progress = createEmptyCourseProgress(PRIMARY_FOUR_COURSE.id);
      for (const step of firstLesson.steps) {
        progress = completeLearningStep(progress, firstLesson, step.id, true);
      }
      setSessionCourseProgress(progress);

      const write = vi.spyOn(Storage.prototype, "setItem");
      renderShell(course);

      const bar = screen.getByRole("progressbar", { name: "Progression du cours" });
      expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
      expect(screen.getByText(/1 sur 40 leçons/)).toBeInTheDocument();
      expect(write).not.toHaveBeenCalled();
    });
  });
});

describe("Lecteur intégré au portail", () => {
  beforeEach(async () => {
    cleanup();
    localStorage.clear();
    resetSessionCourseProgress();
    await i18next.changeLanguage("fr");
    window.history.pushState({}, "", "/app");
  });

  function renderAt(path: string) {
    window.history.pushState({}, "", path);
    return render(<AppRouter />);
  }

  it.each(READER_COURSES.filter((course) => ["MATH-1P", "MATH-4P"].includes(course.id)))(
    "affiche les vrais modules de $id dans le menu, avec un seul lecteur pour les deux modèles de données",
    (course) => {
      renderAt(`/app${course.basePath}`);

      expect(within(outline()).getAllByRole("link")).toHaveLength(course.modules.length + 1);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("main")).toBeInTheDocument();
    },
  );

  it("ouvre le premier module depuis le grand bouton du panneau d'accueil", async () => {
    const user = userEvent.setup();
    renderAt("/app/apprentissages/primaire/4/mathematiques");

    const start = screen.getByRole("link", { name: "Commencer mon parcours" });
    expect(start.getAttribute("href")).toContain("/apprentissages/primaire/4/mathematiques/");

    await user.click(start);
    expect(window.location.pathname).toContain("/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01");
    expect(within(outline()).getByRole("link", { name: /Les nombres jusqu'à 100 000/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("affiche des pastilles tirées du contenu réel, sans durée inventée", () => {
    renderAt("/app/apprentissages/primaire/4/mathematiques");

    expect(screen.getByText("10 modules")).toBeInTheDocument();
    expect(screen.getByText("4 leçons disponibles")).toBeInTheDocument();
    expect(screen.queryByText(/\d\s*h\b|minutes?/i)).not.toBeInTheDocument();
  });

  it("n'applique pas le lecteur aux autres pages du portail", () => {
    renderAt("/app/exetat");

    expect(screen.queryByRole("navigation", { name: "Sommaire du cours" })).not.toBeInTheDocument();
  });
});
