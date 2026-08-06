(function initializeFractionRiverDirectLaunch(root) {
    "use strict";

    const LINK_SELECTOR = "[data-fraction-river-direct-launch]";
    const STYLE_ID = "fraction-river-direct-launch-styles";
    const EXIT_MESSAGE = "fraction-river:exit";
    const DEVICE_READY_TIMEOUT_MS = 1200;
    const FRAME_READY_TIMEOUT_MS = 6000;
    let activeSession = null;

    function requestFullscreen(element) {
        const request = element.requestFullscreen || element.webkitRequestFullscreen;
        if (typeof request !== "function") {
            return Promise.resolve(false);
        }
        try {
            const result = request.call(element);
            return result && typeof result.then === "function"
                ? result.then(() => true).catch(() => false)
                : Promise.resolve(true);
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    function exitFullscreen(document) {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            return Promise.resolve();
        }
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (typeof exit !== "function") {
            return Promise.resolve();
        }
        try {
            const result = exit.call(document);
            return result && typeof result.then === "function"
                ? result.catch(() => {})
                : Promise.resolve();
        } catch (error) {
            return Promise.resolve();
        }
    }

    function lockLandscape() {
        const orientation = root.screen && root.screen.orientation;
        if (!orientation || typeof orientation.lock !== "function") {
            return Promise.resolve(false);
        }
        try {
            const result = orientation.lock("landscape");
            return result && typeof result.then === "function"
                ? result.then(() => true).catch(() => false)
                : Promise.resolve(true);
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    function unlockOrientation() {
        const orientation = root.screen && root.screen.orientation;
        if (orientation && typeof orientation.unlock === "function") {
            try {
                orientation.unlock();
            } catch (error) {
                // Le navigateur restaurera lui-même son orientation habituelle.
            }
        }
    }

    function wait(milliseconds) {
        return new Promise((resolve) => root.setTimeout(resolve, milliseconds));
    }

    function installStyles(document) {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = [
            "body.is-fraction-river-launching{overflow:hidden!important}",
            ".fraction-river-launch{position:fixed;inset:0;z-index:2147483000;width:100vw;height:100vh;overflow:hidden;background:#071c2f;color:#fff;display:grid;place-items:center}",
            ".fraction-river-launch:fullscreen,.fraction-river-launch:-webkit-full-screen{width:100vw;height:100vh}",
            ".fraction-river-launch__frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#071c2f;opacity:0;transition:opacity .18s ease}",
            ".fraction-river-launch.is-ready .fraction-river-launch__frame{opacity:1}",
            ".fraction-river-launch__loader{position:relative;z-index:2;display:grid;justify-items:center;gap:12px;padding:24px;text-align:center;transition:opacity .18s ease}",
            ".fraction-river-launch.is-ready .fraction-river-launch__loader{opacity:0;pointer-events:none}",
            ".fraction-river-launch__loader-mark{font-size:clamp(40px,8vw,72px);filter:drop-shadow(0 8px 18px rgba(0,0,0,.24))}",
            ".fraction-river-launch__loader strong{font:800 clamp(18px,4vw,28px)/1.2 system-ui,sans-serif}",
            ".fraction-river-launch__loader span{font:500 clamp(13px,2.5vw,16px)/1.4 system-ui,sans-serif;color:#cfe7f5}",
            ".fraction-river-launch__cancel{position:absolute;z-index:3;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:44px;height:44px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(5,20,34,.74);color:#fff;font:700 22px/1 system-ui,sans-serif;cursor:pointer}",
            ".fraction-river-launch.is-ready .fraction-river-launch__cancel{opacity:0;pointer-events:none}",
            "@media (prefers-reduced-motion:reduce){.fraction-river-launch__frame,.fraction-river-launch__loader{transition:none}}"
        ].join("");
        document.head.appendChild(style);
    }

    function createLaunchSurface(document, url) {
        const overlay = document.createElement("div");
        overlay.className = "fraction-river-launch";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "La Rivière des fractions");

        const loader = document.createElement("div");
        loader.className = "fraction-river-launch__loader";
        loader.setAttribute("aria-live", "polite");

        const mark = document.createElement("span");
        mark.className = "fraction-river-launch__loader-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "🏞️";

        const title = document.createElement("strong");
        title.textContent = "La rivière se prépare…";

        const hint = document.createElement("span");
        hint.textContent = "Passage en plein écran paysage";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "fraction-river-launch__cancel";
        cancel.setAttribute("aria-label", "Annuler le lancement");
        cancel.textContent = "✕";

        const frame = document.createElement("iframe");
        frame.className = "fraction-river-launch__frame";
        frame.title = "Jeu La Rivière des fractions";
        frame.setAttribute("allow", "fullscreen");
        frame.setAttribute("allowfullscreen", "");

        loader.appendChild(mark);
        loader.appendChild(title);
        loader.appendChild(hint);
        overlay.appendChild(loader);
        overlay.appendChild(cancel);
        overlay.appendChild(frame);
        frame.src = url;

        return {overlay, frame, cancel};
    }

    function launch(link) {
        if (activeSession || !link || !link.href) {
            return;
        }

        const document = link.ownerDocument || root.document;
        installStyles(document);

        const previousFocus = document.activeElement;
        const surface = createLaunchSurface(document, link.href);
        const overlay = surface.overlay;
        const frame = surface.frame;
        let fullscreenEntered = false;
        let frameLoaded = false;
        let deviceReady = false;
        let closed = false;

        document.body.appendChild(overlay);
        document.body.classList.add("is-fraction-river-launching");
        link.setAttribute("aria-busy", "true");

        function revealWhenReady() {
            if (!closed && frameLoaded && deviceReady) {
                overlay.classList.add("is-ready");
            }
        }

        function cleanup() {
            if (closed) {
                return;
            }
            closed = true;
            root.removeEventListener("message", onMessage);
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
            unlockOrientation();
            link.removeAttribute("aria-busy");
            document.body.classList.remove("is-fraction-river-launching");
            activeSession = null;
            exitFullscreen(document).finally(() => {
                overlay.remove();
                if (previousFocus && typeof previousFocus.focus === "function") {
                    previousFocus.focus();
                }
            });
        }

        function onMessage(event) {
            if (event.origin !== root.location.origin
                || event.source !== frame.contentWindow
                || !event.data
                || event.data.type !== EXIT_MESSAGE) {
                return;
            }
            cleanup();
        }

        function onFullscreenChange() {
            const current = document.fullscreenElement || document.webkitFullscreenElement;
            if (fullscreenEntered && current !== overlay) {
                cleanup();
            }
        }

        frame.addEventListener("load", () => {
            frameLoaded = true;
            revealWhenReady();
        }, {once: true});
        surface.cancel.addEventListener("click", cleanup);
        root.addEventListener("message", onMessage);
        document.addEventListener("fullscreenchange", onFullscreenChange);
        document.addEventListener("webkitfullscreenchange", onFullscreenChange);

        // Cette demande est déclenchée dans le gestionnaire du clic, avant toute
        // navigation. Le geste de l'enfant reste donc valide pour le plein écran.
        Promise.race([
            requestFullscreen(overlay)
                .then((entered) => {
                    fullscreenEntered = entered;
                    return lockLandscape();
                }),
            wait(DEVICE_READY_TIMEOUT_MS)
        ]).finally(() => {
            deviceReady = true;
            revealWhenReady();
        });

        // Un chargement très lent ne doit jamais laisser l'enfant bloqué derrière
        // le décor d'attente. Le jeu garde son adaptation CSS si le paysage natif
        // n'est pas disponible.
        wait(FRAME_READY_TIMEOUT_MS).then(() => {
            if (!closed) {
                frameLoaded = true;
                deviceReady = true;
                revealWhenReady();
            }
        });

        activeSession = {close: cleanup, overlay, frame};
    }

    function handleLaunchClick(event) {
        const link = event.currentTarget;
        if (!link || !link.href) {
            return;
        }
        event.preventDefault();
        launch(link);
    }

    function mount(document) {
        document.querySelectorAll(LINK_SELECTOR).forEach((link) => {
            link.addEventListener("click", handleLaunchClick);
        });
    }

    const api = {mount, launch, createLaunchSurface, requestFullscreen, lockLandscape};
    root.FractionRiverLaunch = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }

    if (root.document) {
        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", () => mount(root.document));
        } else {
            mount(root.document);
        }
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
