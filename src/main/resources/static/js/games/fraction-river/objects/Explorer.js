(function initializeExplorer(root) {
    "use strict";

    const WALK_DURATION_MS = 2600;
    // Ratio du bas du dessin dans l'image, mesuré au pixel sur explorer-boy.png
    // (1024x1536, contenu jusqu'à la ligne 1412). En dessous, l'image est vide.
    const CONTENT_BOTTOM_RATIO = 0.919;

    // Le héros illustré reste dans la pirogue pendant la traversée, puis en
    // descend pour marcher vers le village lors de la scène finale.
    function createExplorer(scene, x, y, options = {}) {
        const reducedMotion = Boolean(options.reducedMotion);

        const container = scene.add.container(x, y);

        const paddlingHero = scene.add.image(0, 8, "fr-explorer-boy-paddling");
        paddlingHero.setDisplaySize(40, 60);
        paddlingHero.setOrigin(0.5, 0.92);

        const hero = scene.add.image(0, 8, "fr-explorer-boy");
        hero.setDisplaySize(38, 57);
        hero.setOrigin(0.5, 0.92);
        hero.setVisible(false);
        // Échelle de repos, pour pouvoir écraser puis restituer le personnage
        // sans perdre la taille fixée par setDisplaySize.
        const heroScale = {x: hero.scaleX, y: hero.scaleY};

        const hull = scene.add.ellipse(0, 12, 46, 14, 0x8a5a2b);
        const gunwale = scene.add.rectangle(0, 6, 48, 5, 0x6b4423);
        gunwale.setOrigin(0.5);

        const paddle = scene.add.rectangle(9, -23, 32, 3, 0x6b4423);
        paddle.setOrigin(0, 0.5);
        paddle.setAngle(24);

        container.add([paddlingHero, hero, hull, gunwale, paddle]);
        container.setSize(50, 62);

        // Écart entre l'ancre du conteneur et les semelles dessinées, déduit du
        // sprite au lieu d'être supposé : sa position dans le conteneur, plus
        // le décalage éventuel entre son origine et le bas du dessin.
        function feetOffset() {
            return hero.y + (CONTENT_BOTTOM_RATIO - hero.originY) * hero.displayHeight;
        }

        // L'ombre reste collée au sol pendant que le héros monte et descend :
        // c'est elle qui dit à l'œil qu'il marche au lieu de flotter.
        const shadow = scene.add.ellipse(x, y + feetOffset(), 32, 8, 0x14301f, 0.3);
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
            const duration = Math.max(950, Math.min(1900, distance * 9));
            const arcHeight = Math.min(78, 30 + distance * 0.34);
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

        // groundY est la hauteur de la SURFACE sur laquelle marcher, pas celle
        // du conteneur : la conversion se fait ici, une fois le sprite de marche
        // en place, sinon l'écart serait mesuré sur le mauvais sprite.
        function walkTo(targetX, groundY, duration = WALK_DURATION_MS) {
            const startX = container.x;
            const startY = container.y;

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
            hero.setY(0);
            hero.setAngle(0);

            const offset = feetOffset();
            const baseY = groundY !== undefined ? groundY - offset : startY;
            const groundLine = baseY + offset;

            // Il descend d'abord sur le plancher, puis marche. Interpoler la
            // hauteur pendant le trajet le faisait flotter tout du long et ne
            // toucher le bois qu'au dernier instant.
            container.setY(baseY);

            if (reducedMotion) {
                container.setPosition(targetX, baseY);
                shadow.setPosition(targetX, baseY + offset);
                shadow.setVisible(true);
                return Promise.resolve();
            }

            const distance = Math.abs(targetX - startX);
            // Une foulée tous les 38 px, et environ une demi-seconde par pas :
            // la cadence est celle d'un enfant qui marche, quelle que soit la
            // distance à parcourir.
            const steps = Math.max(3, Math.round(distance / 38));
            const marche = Math.max(duration, steps * 520);
            const progress = {t: 0};
            let lastFoot = -1;

            shadow.setVisible(true);

            return new Promise((resolve) => {
                walkTween = scene.tweens.add({
                    targets: progress,
                    t: 1,
                    duration: marche,
                    ease: "Linear",
                    onUpdate: () => {
                        const t = progress.t;
                        // Une demi-période par pas : la phase vaut 0 à chaque
                        // pose du pied, π/2 au milieu de l'enjambée.
                        const phase = t * Math.PI * steps;
                        const leve = Math.abs(Math.sin(phase));

                        // Avance par à-coups. Un marcheur est propulsé à chaque
                        // poussée puis ralentit : c'est cette irrégularité, et
                        // non la vitesse moyenne, qui se lit comme des pas.
                        const poussee = Math.sin(2 * phase) / (2 * Math.PI * steps);
                        const avance = Math.min(1, Math.max(0, t + poussee * 0.6));
                        container.x = startX + (targetX - startX) * avance;

                        // Le corps se soulève entre deux appuis et revient
                        // exactement sur le plancher au moment du contact.
                        container.y = baseY - leve * 2.6;

                        // Écrasement à la pose, étirement en l'air. L'origine du
                        // sprite étant aux pieds, la compression part du sol.
                        hero.setScale(
                            heroScale.x * (1 + (1 - leve) * 0.02),
                            heroScale.y * (1 - (1 - leve) * 0.03)
                        );
                        hero.setAngle(Math.sin(phase) * 2.4);

                        shadow.setPosition(container.x, groundLine);
                        shadow.setScale(1 - leve * 0.18, 1);
                        shadow.setAlpha(0.32 - leve * 0.12);

                        const foot = Math.floor(phase / Math.PI);
                        if (foot !== lastFoot) {
                            lastFoot = foot;
                            raiseDust(container.x, groundLine);
                        }
                    },
                    onComplete: () => {
                        walkTween = null;
                        container.setPosition(targetX, baseY);
                        hero.setAngle(0);
                        hero.setScale(heroScale.x, heroScale.y);
                        shadow.setPosition(targetX, baseY + offset);
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
            hero.setScale(heroScale.x, heroScale.y);
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

        return {
            container,
            shadow,
            feetOffset,
            jumpTo,
            walkTo,
            cheer,
            resetTo,
            paddleFaster,
            setBoatVisible
        };
    }

    root.createExplorer = createExplorer;
    root.FRACTION_RIVER_WALK_DURATION_MS = WALK_DURATION_MS;
})(typeof globalThis !== "undefined" ? globalThis : window);
