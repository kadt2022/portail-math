(function initializeResultScene(root) {
    "use strict";

    // Bandeau de fête au-dessus de la rivière. Les chiffres officiels de la
    // traversée restent dans le panneau HTML : cette scène ne fait que célébrer.
    function createResultScene(Phaser) {
        return class ResultScene extends Phaser.Scene {
            constructor() {
                super({key: "ResultScene", active: false});
            }

            init(data) {
                this.bus = (data && data.bus) || root.FractionRiverEvents;
                this.reducedMotion = Boolean(data && data.reducedMotion);
                this.unsubscribers = [];
            }

            create() {
                const width = this.scale.width;
                this.banner = this.add.container(width / 2, -60);
                this.banner.setScrollFactor(0);
                this.banner.setDepth(120);

                const box = this.add.rectangle(0, 0, 320, 62, 0xffffff, 0.96);
                box.setStrokeStyle(3, 0x13ad78);
                const title = this.add.text(0, -10, "Traversée terminée !", {
                    fontFamily: "Inter, Segoe UI, Roboto, sans-serif",
                    fontSize: "20px",
                    color: "#0b8e61",
                    fontStyle: "bold"
                });
                title.setOrigin(0.5);
                const subtitle = this.add.text(0, 14, "Tu as rejoint le village.", {
                    fontFamily: "Inter, Segoe UI, Roboto, sans-serif",
                    fontSize: "13px",
                    color: "#626985"
                });
                subtitle.setOrigin(0.5);
                this.banner.add([box, title, subtitle]);
                this.banner.setAlpha(0);

                this.unsubscribers.push(this.bus.on("journey:completed", () => this.show()));
                this.unsubscribers.push(this.bus.on("journey:started", () => this.hide()));
                this.events.once("shutdown", () => {
                    this.unsubscribers.forEach((off) => off && off());
                    this.unsubscribers = [];
                });
            }

            show() {
                if (this.reducedMotion) {
                    this.banner.setAlpha(1);
                    this.banner.setY(58);
                    return;
                }
                this.banner.setAlpha(0);
                this.banner.setY(-60);
                this.tweens.add({
                    targets: this.banner,
                    y: 58,
                    alpha: 1,
                    duration: 700,
                    delay: 900,
                    ease: "Back.easeOut"
                });
            }

            hide() {
                this.banner.setAlpha(0);
                this.banner.setY(-60);
            }
        };
    }

    root.createResultScene = createResultScene;
})(typeof globalThis !== "undefined" ? globalThis : window);
