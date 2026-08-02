(function initializeFrog(root) {
    "use strict";

    // La grenouille porte l'indice. Elle double le texte affiché en HTML :
    // le canvas ne doit jamais être le seul moyen de lire une aide (§4.7).
    function createFrog(scene, x, y, options = {}) {
        const reducedMotion = Boolean(options.reducedMotion);

        const leaf = scene.add.ellipse(x, y + 12, 54, 18, 0x2f8a5c);
        const leafVein = scene.add.rectangle(x, y + 12, 40, 2, 0x1f6b45);

        const frog = scene.add.container(x, y);
        const body = scene.add.ellipse(0, 0, 34, 24, 0x3fae62);
        const backLeg = scene.add.ellipse(-14, 6, 14, 8, 0x2f8a5c);
        const frontLeg = scene.add.ellipse(14, 6, 14, 8, 0x2f8a5c);
        const eyeBaseL = scene.add.circle(-8, -12, 7, 0x3fae62);
        const eyeBaseR = scene.add.circle(8, -12, 7, 0x3fae62);
        const eyeL = scene.add.circle(-8, -13, 4, 0xffffff);
        const eyeR = scene.add.circle(8, -13, 4, 0xffffff);
        const pupilL = scene.add.circle(-8, -13, 2, 0x14301f);
        const pupilR = scene.add.circle(8, -13, 2, 0x14301f);
        frog.add([backLeg, frontLeg, body, eyeBaseL, eyeBaseR, eyeL, eyeR, pupilL, pupilR]);

        const bubble = scene.add.container(x, y - 58);
        const bubbleBox = scene.add.rectangle(0, 0, 210, 52, 0xffffff, 0.96);
        bubbleBox.setStrokeStyle(2, 0x2f8a5c);
        const bubbleTail = scene.add.triangle(0, 28, -8, 0, 8, 0, 0, 12, 0xffffff);
        const bubbleText = scene.add.text(0, 0, "", {
            fontFamily: "Inter, Segoe UI, Roboto, sans-serif",
            fontSize: "13px",
            color: "#171932",
            align: "center",
            wordWrap: {width: 190}
        });
        bubbleText.setOrigin(0.5);
        bubble.add([bubbleBox, bubbleTail, bubbleText]);
        bubble.setAlpha(0);
        bubble.setDepth(60);

        let hideTimer = null;

        function idle() {
            if (reducedMotion) {
                return;
            }
            scene.tweens.add({
                targets: frog,
                y: y - 3,
                duration: 1900,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
            scene.tweens.add({
                targets: [leaf, leafVein],
                angle: {from: -1.5, to: 1.5},
                duration: 3200,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        }

        function blink() {
            if (reducedMotion) {
                return;
            }
            scene.tweens.add({
                targets: [eyeL, eyeR, pupilL, pupilR],
                scaleY: 0.1,
                duration: 90,
                yoyo: true,
                ease: "Sine.easeInOut"
            });
        }

        function say(text) {
            bubbleText.setText(String(text || ""));
            bubble.setAlpha(1);
            blink();
            if (!reducedMotion) {
                scene.tweens.add({
                    targets: frog,
                    scaleX: 1.1,
                    scaleY: 0.9,
                    duration: 140,
                    yoyo: true,
                    ease: "Sine.easeInOut"
                });
            }
            if (hideTimer) {
                hideTimer.remove();
            }
            hideTimer = scene.time.delayedCall(6000, hide);
        }

        function hide() {
            if (reducedMotion) {
                bubble.setAlpha(0);
                return;
            }
            scene.tweens.add({targets: bubble, alpha: 0, duration: 260});
        }

        idle();

        return {frog, bubble, say, hide, blink};
    }

    root.createFrog = createFrog;
})(typeof globalThis !== "undefined" ? globalThis : window);
