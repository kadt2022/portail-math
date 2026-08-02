(function initializeExplorer(root) {
    "use strict";

    // L'explorateur et sa pirogue. Le saut suit une vraie parabole : c'est
    // précisément ce qu'une transition CSS ne savait pas faire.
    function createExplorer(scene, x, y, options = {}) {
        const reducedMotion = Boolean(options.reducedMotion);

        const container = scene.add.container(x, y);

        const hull = scene.add.ellipse(0, 16, 62, 18, 0x8a5a2b);
        const gunwale = scene.add.rectangle(0, 8, 64, 6, 0x6b4423);
        gunwale.setOrigin(0.5);
        const body = scene.add.ellipse(0, -4, 20, 24, 0x2f5fb5);
        const head = scene.add.circle(0, -22, 11, 0x6b4226);
        const hair = scene.add.ellipse(0, -29, 22, 12, 0x2a1a10);
        const eyeLeft = scene.add.circle(-4, -23, 2, 0xffffff);
        const eyeRight = scene.add.circle(4, -23, 2, 0xffffff);

        const paddle = scene.add.rectangle(16, -2, 34, 4, 0x6b4423);
        paddle.setOrigin(0, 0.5);

        container.add([hull, gunwale, body, head, hair, eyeLeft, eyeRight, paddle]);
        container.setSize(64, 60);

        let bobTween = null;
        let paddleTween = null;

        function startIdle() {
            if (reducedMotion) {
                return;
            }
            bobTween = scene.tweens.add({
                targets: container,
                y: y - 4,
                duration: 1600,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
            paddleTween = scene.tweens.add({
                targets: paddle,
                angle: {from: -14, to: 16},
                duration: 1200,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        }

        function paddleFaster(active) {
            if (!paddleTween) {
                return;
            }
            paddleTween.timeScale = active ? 2.4 : 1;
        }

        // Saut d'un appui à l'autre : trajectoire en arc, atterrissage amorti.
        function jumpTo(targetX, targetY) {
            const startX = container.x;
            const baseY = targetY !== undefined ? targetY : y;
            if (reducedMotion) {
                container.setPosition(targetX, baseY);
                return Promise.resolve();
            }

            const distance = Math.abs(targetX - startX);
            const duration = Math.max(700, Math.min(1500, distance * 4));
            const arcHeight = Math.min(60, 24 + distance * 0.18);
            const progress = {t: 0};

            paddleFaster(true);
            if (bobTween) {
                bobTween.pause();
            }

            return new Promise((resolve) => {
                scene.tweens.add({
                    targets: progress,
                    t: 1,
                    duration,
                    ease: "Sine.easeInOut",
                    onUpdate: () => {
                        const t = progress.t;
                        container.x = startX + (targetX - startX) * t;
                        container.y = baseY - Math.sin(Math.PI * t) * arcHeight;
                        container.setRotation(Math.cos(Math.PI * t) * 0.08);
                    },
                    onComplete: () => {
                        container.setRotation(0);
                        container.setPosition(targetX, baseY);
                        paddleFaster(false);
                        if (bobTween) {
                            bobTween.updateTo("y", baseY - 4, true);
                            bobTween.resume();
                        }
                        resolve();
                    }
                });
            });
        }

        function cheer() {
            if (reducedMotion) {
                return;
            }
            scene.tweens.add({
                targets: container,
                scaleX: 1.12,
                scaleY: 1.12,
                duration: 220,
                yoyo: true,
                repeat: 1,
                ease: "Sine.easeInOut"
            });
        }

        function resetTo(originX, originY) {
            container.setPosition(originX, originY);
            container.setRotation(0);
            container.setScale(1);
        }

        startIdle();

        return {container, jumpTo, cheer, resetTo, paddleFaster};
    }

    root.createExplorer = createExplorer;
})(typeof globalThis !== "undefined" ? globalThis : window);
