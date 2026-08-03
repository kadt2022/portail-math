(function initializeFractionRiverVisuals(root) {
    "use strict";

    const VISUAL_KINDS = ["DISC", "BAR", "BASKET"];
    const INTERACTIVE_KINDS = ["BAR", "BASKET"];

    const VISUAL_LABELS = {
        DISC: "pizza",
        BAR: "tablette de chocolat",
        BASKET: "panier de fruits"
    };

    function partWord(count) {
        return count > 1 ? "parts" : "part";
    }

    function describeVisual(kind, filled, total) {
        const support = VISUAL_LABELS[kind] || "objet";
        return `Une ${support} partagée en ${total} parts égales, `
            + `${filled} ${partWord(filled)} sur ${total} de couleur différente.`;
    }

    function polarPoint(centre, radius, degrees) {
        const radians = ((degrees - 90) * Math.PI) / 180;
        return {
            x: centre + radius * Math.cos(radians),
            y: centre + radius * Math.sin(radians)
        };
    }

    function discSlicePath(index, total) {
        const centre = 60;
        const radius = 52;
        const sweep = 360 / total;
        const start = polarPoint(centre, radius, index * sweep);
        const end = polarPoint(centre, radius, (index + 1) * sweep);
        const largeArc = sweep > 180 ? 1 : 0;
        return `M ${centre} ${centre} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} `
            + `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
    }

    // Les parts remplies portent une couleur ET une trame : aucune information ne
    // dépend uniquement de la couleur (principe 15 du cahier des charges).
    function hatchDefinition(patternId) {
        return `<defs><pattern id="${patternId}" width="8" height="8" `
            + `patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`
            + `<rect width="8" height="8" class="fr-hatch-background"></rect>`
            + `<line x1="0" y1="0" x2="0" y2="8" class="fr-hatch-line"></line>`
            + `</pattern></defs>`;
    }

    function partClass(isFilled) {
        return isFilled ? "fr-part fr-part--filled" : "fr-part";
    }

    function partFill(isFilled, patternId) {
        return isFilled ? ` fill="url(#${patternId})"` : "";
    }

    function renderDisc(total, filled, patternId) {
        const slices = Array.from({length: total}, (_, index) => {
            const isFilled = index < filled;
            return `<path d="${discSlicePath(index, total)}" class="${partClass(isFilled)}"`
                + `${partFill(isFilled, patternId)}></path>`;
        }).join("");
        return `<svg viewBox="0 0 120 120" class="fr-visual fr-visual--disc" role="img" `
            + `aria-label="{{label}}">${hatchDefinition(patternId)}${slices}`
            + `<circle cx="60" cy="60" r="52" class="fr-visual-outline"></circle></svg>`;
    }

    function renderBar(total, filled, patternId) {
        const width = 240;
        const height = 64;
        const partWidth = width / total;
        const parts = Array.from({length: total}, (_, index) => {
            const isFilled = index < filled;
            return `<rect x="${(index * partWidth).toFixed(2)}" y="0" `
                + `width="${partWidth.toFixed(2)}" height="${height}" `
                + `class="${partClass(isFilled)}"${partFill(isFilled, patternId)}></rect>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" class="fr-visual fr-visual--bar" role="img" `
            + `aria-label="{{label}}">${hatchDefinition(patternId)}${parts}`
            + `<rect x="0" y="0" width="${width}" height="${height}" class="fr-visual-outline"></rect></svg>`;
    }

    function renderBasket(total, filled, patternId) {
        const gap = 12;
        const radius = 26;
        const step = radius * 2 + gap;
        const width = total * step + gap;
        const circles = Array.from({length: total}, (_, index) => {
            const isFilled = index < filled;
            const cx = gap + radius + index * step;
            return `<circle cx="${cx}" cy="40" r="${radius}" class="${partClass(isFilled)}"`
                + `${partFill(isFilled, patternId)}></circle>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} 80" class="fr-visual fr-visual--basket" role="img" `
            + `aria-label="{{label}}">${hatchDefinition(patternId)}${circles}</svg>`;
    }

    const RENDERERS = {
        DISC: renderDisc,
        BAR: renderBar,
        BASKET: renderBasket
    };

    function escapeAttribute(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function renderStaticVisual({kind, total, filled, id = "fr"}) {
        const renderer = RENDERERS[kind];
        if (!renderer) {
            throw new Error(`Type de visuel inconnu : ${kind}`);
        }
        if (!Number.isInteger(total) || total < 2) {
            throw new Error("Un tout doit contenir au moins deux parts égales");
        }
        if (!Number.isInteger(filled) || filled < 0 || filled > total) {
            throw new Error("Nombre de parts coloriées incohérent avec le tout");
        }
        const markup = renderer(total, filled, `${id}-hatch`);
        return markup.replace("{{label}}", escapeAttribute(describeVisual(kind, filled, total)));
    }

    // Les parts cliquables sont de vrais boutons : navigation clavier, focus visible
    // et cible tactile d'au moins 44 px (§4.7).
    function renderInteractiveParts({kind, total, selected = []}) {
        if (!INTERACTIVE_KINDS.includes(kind)) {
            throw new Error(`Visuel non interactif : ${kind}`);
        }
        const selection = new Set(selected);
        const buttons = Array.from({length: total}, (_, index) => {
            const isSelected = selection.has(index);
            return `<button type="button" class="fr-selectable-part" data-part="${index}" `
                + `aria-pressed="${isSelected}" `
                + `aria-label="Part ${index + 1} sur ${total}">`
                + `<span class="fr-selectable-part__mark" aria-hidden="true"></span></button>`;
        }).join("");
        return `<div class="fr-selectable fr-selectable--${kind.toLowerCase()}" role="group" `
            + `aria-label="Parts à sélectionner">${buttons}</div>`;
    }

    const api = {
        VISUAL_KINDS,
        INTERACTIVE_KINDS,
        describeVisual,
        renderStaticVisual,
        renderInteractiveParts
    };

    root.FractionRiverVisuals = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
