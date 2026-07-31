(() => {
    const body = document.body;
    const toggle = document.querySelector("[data-nav-toggle]");
    const closeButton = document.querySelector("[data-nav-close]");
    const sidebar = document.getElementById("site-navigation");

    if (!toggle || !sidebar) {
        return;
    }

    const closeNavigation = () => {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.querySelector(".visually-hidden").textContent = "Ouvrir le menu";
    };

    const openNavigation = () => {
        body.classList.add("nav-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.querySelector(".visually-hidden").textContent = "Fermer le menu";
        sidebar.querySelector("a")?.focus();
    };

    toggle.addEventListener("click", () => {
        if (body.classList.contains("nav-open")) {
            closeNavigation();
        } else {
            openNavigation();
        }
    });

    closeButton?.addEventListener("click", closeNavigation);

    sidebar.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeNavigation);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && body.classList.contains("nav-open")) {
            closeNavigation();
            toggle.focus();
        }
    });

    const desktopQuery = window.matchMedia("(min-width: 901px)");
    desktopQuery.addEventListener("change", (event) => {
        if (event.matches) {
            closeNavigation();
        }
    });

    const filterButtons = document.querySelectorAll("[data-subject-filter]");
    const subjectCards = document.querySelectorAll(".catalog-card[data-category]");
    const filterResult = document.querySelector("[data-filter-result]");

    if (filterButtons.length && subjectCards.length) {
        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const selectedCategory = button.dataset.subjectFilter;
                let visibleCount = 0;

                filterButtons.forEach((item) => {
                    const isActive = item === button;
                    item.classList.toggle("filter-button--active", isActive);
                    item.setAttribute("aria-pressed", String(isActive));
                });

                subjectCards.forEach((card) => {
                    const isVisible = selectedCategory === "all"
                        || card.dataset.category === selectedCategory;
                    card.hidden = !isVisible;
                    if (isVisible) {
                        visibleCount += 1;
                    }
                });

                if (filterResult) {
                    filterResult.textContent = `${visibleCount} matière${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""}`;
                }
            });
        });
    }
})();
