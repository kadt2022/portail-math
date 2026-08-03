(function initializeFractionStone(root) {
    "use strict";

    // Une pierre du gué. Invisible tant que l'étape n'est pas réussie, elle
    // émerge de l'eau avec une onde — c'est la récompense visuelle de l'effort.
    function createFractionStone(scene, x, y, options = {}) {
        const reducedMotion = Boolean(options.reducedMotion);

        const ripple = scene.add.ellipse(x, y + 4, 20, 8);
        ripple.setStrokeStyle(2, 0xffffff, 0.85);
        ripple.setVisible(false);

        const stone = scene.add.container(x, y);

        const shadow = scene.add.ellipse(0, 6, 46, 12, 0x0d3f63, 0.45);
        const body = scene.add.ellipse(0, 0, 44, 20, 0x8a8272);
        const top = scene.add.ellipse(0, -4, 34, 12, 0xa9a08c);
        const moss = scene.add.ellipse(-8, -6, 12, 5, 0x2f8a5c, 0.8);
        stone.add([shadow, body, top, moss]);

        stone.setAlpha(0);
        stone.setScale(0.4);

        function placeInstantly() {
            stone.setAlpha(1);
            stone.setScale(1);
        }

        function reveal() {
            if (reducedMotion) {
                placeInstantly();
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                scene.tweens.add({
                    targets: stone,
                    alpha: 1,
                    scale: 1,
                    y: {from: y + 14, to: y},
                    duration: 620,
                    ease: "Back.easeOut",
                    onComplete: () => resolve()
                });

                ripple.setVisible(true);
                ripple.setScale(0.3);
                ripple.setAlpha(0.9);
                scene.tweens.add({
                    targets: ripple,
                    scaleX: 3.2,
                    scaleY: 2.4,
                    alpha: 0,
                    duration: 900,
                    ease: "Sine.easeOut",
                    onComplete: () => ripple.setVisible(false)
                });
            });
        }

        function reset() {
            stone.setAlpha(0);
            stone.setScale(0.4);
            stone.setY(y);
            ripple.setVisible(false);
        }

        return {
            container: stone,
            x,
            y,
            reveal,
            placeInstantly,
            reset,
            get isPlaced() {
                return stone.alpha > 0.9;
            }
        };
    }

    root.createFractionStone = createFractionStone;
})(typeof globalThis !== "undefined" ? globalThis : window);
