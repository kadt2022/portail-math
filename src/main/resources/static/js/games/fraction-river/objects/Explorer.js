(function initializeExplorer(root) {
    "use strict";

    const WALK_DURATION_MS = 2600;
    // Distance entre l'ancre du conteneur et la plante des pieds : l'ombre et
    // la poussière doivent se poser là, pas sous le nombril du personnage.
    const FOOT_OFFSET = 14;

    // Le héros illustré reste dans la pirogue pendant la traversée, puis en
    // descend pour marcher vers le village lors de la scène finale.
    function createExplorer(scene, x, y, options = {}) {
        const reducedMotion = Boolean(options.reducedMotion);

        const container = scene.add.container(x, y);

        const paddlingHero = scene.add.image(0, 8, "fr-explorer-boy-paddling");
        paddlingHero.setDisplaySize(54, 81);
        paddlingHero.setOrigin(0.5, 0.92);

        const hero = scene.add.image(0, 8, "fr-explorer-boy");
        hero.setDisplaySize(52, 78);
        hero.setOrigin(0.5, 0.92);
        hero.setVisible(false);

        const hull = scene.add.ellipse(0, 16, 62, 18, 0x8a5a2b);
        const gunwale = scene.add.rectangle(0, 8, 64, 6, 0x6b4423);
        gunwale.setOrigin(0.5);

        const paddle = scene.add.rectangle(12, -31, 42, 4, 0x6b4423);
        paddle.setOrigin(0, 0.5);
        paddle.setAngle(24);

        container.add([paddlingHero, hero, hull, gunwale, paddle]);
        container.setSize(68, 82);

        // L'ombre reste collée au sol pendant que le héros monte et descend :
        // c'est elle qui dit à l'œil qu'il marche au lieu de flotter.
        const shadow = scene.add.ellipse(x, y + FOOT_OFFSET, 44, 10, 0x14301f, 0.3);
        shadow.setDepth(30);
        shadow.setVisible(false);

        let bobTween = null;
        let paddleTween = null;
        let walkTween = null;

        function setBoatVisible(visible) {
            hull.setVisible(visible);
            gunwale.setVisible(visible);
            paddle.setVisible(visible);
        }

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
                angle: {from: 12, to: 38},
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

        function walkTo(targetX, targetY, duration = WALK_DURATION_MS) {
            const startX = container.x;
            const baseY = targetY !== undefined ? targetY : y;

            if (bobTween) {
                bobTween.pause();
            }
            if (paddleTween) {
                paddleTween.pause();
            }
            setBoatVisible(false);
            paddlingHero.setVisible(false);
            hero.setVisible(true);
            container.setRotation(0);
            container.setY(baseY);
            hero.setY(0);
            hero.setAngle(0);

            const startY = container.y;

            if (reducedMotion) {
                container.setPosition(targetX, baseY);
                shadow.setPosition(targetX, baseY + FOOT_OFFSET);
                shadow.setVisible(true);
                return Promise.resolve();
            }

            const distance = Math.abs(targetX - startX);
            // Une foulée tous les ~46 px : la cadence suit la distance réelle,
            // elle n'est plus un nombre d'oscillations arbitraire.
            const steps = Math.max(4, Math.round(distance / 46));
            const progress = {t: 0};
            let lastFoot = -1;

            shadow.setVisible(true);

            return new Promise((resolve) => {
                walkTween = scene.tweens.add({
                    targets: progress,
                    t: 1,
                    duration,
                    // Vitesse constante : un marcheur ne décélère pas comme un planeur.
                    ease: "Linear",
                    onUpdate: () => {
                        const t = progress.t;
                        const phase = t * Math.PI * steps;
                        const lift = Math.abs(Math.sin(phase));
                        const groundY = startY + (baseY - startY) * t;

                        container.x = startX + (targetX - startX) * t;
                        container.y = groundY - lift * 2.2;
                        // Léger déhanchement, et non un balancement de pendule.
                        hero.setAngle(Math.sin(phase * 0.5) * 1.2);

                        shadow.setPosition(container.x, groundY + FOOT_OFFSET);
                        shadow.setScale(1 - lift * 0.16, 1);
                        shadow.setAlpha(0.3 - lift * 0.1);

                        const foot = Math.floor(phase / Math.PI);
                        if (foot !== lastFoot) {
                            lastFoot = foot;
                            raiseDust(container.x, groundY + FOOT_OFFSET);
                        }
                    },
                    onComplete: () => {
                        walkTween = null;
                        container.setPosition(targetX, baseY);
                        hero.setAngle(0);
                        shadow.setPosition(targetX, baseY + FOOT_OFFSET);
                        shadow.setScale(1, 1);
                        shadow.setAlpha(0.3);
                        resolve();
                    }
                });
            });
        }

        // Un petit nuage de poussière à chaque appui : le pied touche le sol.
        function raiseDust(dustX, dustY) {
            if (reducedMotion) {
                return;
            }
            const puff = scene.add.ellipse(dustX - 6, dustY, 12, 5, 0xd8c9a8, 0.65);
            puff.setDepth(31);
            scene.tweens.add({
                targets: puff,
                x: dustX - 22,
                scaleX: 1.9,
                scaleY: 1.4,
                alpha: 0,
                duration: 520,
                ease: "Sine.easeOut",
                onComplete: () => puff.destroy()
            });
        }

        function resetTo(originX, originY) {
            if (walkTween) {
                walkTween.stop();
                walkTween = null;
            }
            container.setPosition(originX, originY);
            container.setRotation(0);
            container.setScale(1);
            shadow.setVisible(false);
            shadow.setScale(1, 1);
            shadow.setAlpha(0.3);
            hero.setPosition(0, 8);
            hero.setAngle(0);
            hero.setVisible(false);
            paddlingHero.setPosition(0, 8);
            paddlingHero.setAngle(0);
            paddlingHero.setVisible(true);
            setBoatVisible(true);
            if (bobTween) {
                bobTween.updateTo("y", originY - 4, true);
                bobTween.resume();
            }
            if (paddleTween) {
                paddleTween.resume();
            }
        }

        startIdle();

        return {container, shadow, jumpTo, walkTo, cheer, resetTo, paddleFaster, setBoatVisible};
    }

    root.createExplorer = createExplorer;
    root.FRACTION_RIVER_WALK_DURATION_MS = WALK_DURATION_MS;
})(typeof globalThis !== "undefined" ? globalThis : window);
