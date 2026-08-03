(function initializeFractionRiverEvents(root) {
    "use strict";

    // Bus minimal entre le moteur pédagogique (HTML, testable en Node) et la
    // scène Phaser. Le moteur émet, la scène écoute : aucune des deux couches
    // n'a besoin de connaître l'autre.
    const EVENTS = [
        "journey:started",
        "step:rendered",
        "answer:correct",
        "answer:incorrect",
        "step:completed",
        "bridge:started",
        "bridge:slab",
        "journey:finale-started",
        "journey:completed"
    ];

    function createEventBus() {
        const listeners = new Map();

        function on(name, handler) {
            if (typeof handler !== "function") {
                return () => {};
            }
            if (!listeners.has(name)) {
                listeners.set(name, new Set());
            }
            listeners.get(name).add(handler);
            return () => off(name, handler);
        }

        function off(name, handler) {
            const handlers = listeners.get(name);
            if (handlers) {
                handlers.delete(handler);
            }
        }

        function emit(name, payload) {
            const handlers = listeners.get(name);
            if (!handlers) {
                return 0;
            }
            let delivered = 0;
            [...handlers].forEach((handler) => {
                try {
                    handler(payload);
                    delivered += 1;
                } catch (error) {
                    // Une scène en échec ne doit jamais bloquer la pédagogie.
                    console.warn(`Écouteur en échec pour ${name} :`, error);
                }
            });
            return delivered;
        }

        function clear() {
            listeners.clear();
        }

        return {on, off, emit, clear};
    }

    const api = {EVENTS, createEventBus};

    root.FractionRiverEvents = createEventBus();
    root.FractionRiverEventsApi = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
