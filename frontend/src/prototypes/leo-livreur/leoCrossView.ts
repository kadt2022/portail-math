// Rendu Phaser du trafic perpendiculaire : un pool de conteneurs réutilisés (aucune création en cours de jeu).
//
// Seules les vraies illustrations fournies sont dessinées : aucun dessin improvisé.
//
// Ce sont des PROFILS (vue de côté). Pour la descente de l'avenue (cap ≈ 135°, vue en perspective), la vue idéale est
// un trois-quarts avant, qui n'existe pas encore (voir assets/leo-intersection-views-v1.md). En attendant, le profil
// fourni est projeté sur la chaussée (leoIntersection `profilePose`) : son flanc reste parallèle à l'axe de la voie
// et ses verticales restent verticales, comme en perspective à un point de fuite. Dès qu'une vue trois-quarts
// sera fournie, `crossViewForHeading` la désignera et ce profil provisoire disparaîtra. En mode diagnostic (?debug,
// développement), un rectangle jaune marque l'empreinte des véhicules dont la vue idéale manque.

import Phaser from "phaser";

import type { CrossVehicle } from "./leoCrossTraffic";
import { crossViewForHeading, profilePose } from "./leoIntersection";
import { needsMirror, rollAngle, vehicleDisplay, wheelOffset, type VehicleSpec } from "./leoVehicleCatalog";

const wheelTextureKey = (spec: VehicleSpec, index: number) => `wheel-${spec.textureKey}-${index}`;

/** Vitesse du fondu d'apparition du profil (par seconde). */
const FADE_RATE = 7;

interface CrossObjects {
  container: Phaser.GameObjects.Container;
  inner: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  wheels: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  spec: VehicleSpec | null;
  alpha: number;
}

export class CrossViews {
  private readonly objects: CrossObjects[] = [];
  private readonly debug?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, count: number, specs: readonly VehicleSpec[], debug = false) {
    for (let index = 0; index < count; index += 1) this.objects.push(this.createObjects(specs[0]));
    if (debug) this.debug = scene.add.graphics().setDepth(12);
  }

  private createObjects(spec: VehicleSpec): CrossObjects {
    const body = this.scene.add.image(0, 0, spec.textureKey).setVisible(false);
    const wheels = [0, 1].map((index) => this.scene.add.image(0, 0, wheelTextureKey(spec, index)).setVisible(false)) as CrossObjects["wheels"];
    // Deux conteneurs imbriqués : rotation interne, puis échelles et rotation externe = cisaillement du profil.
    const inner = this.scene.add.container(0, 0, [body, wheels[0], wheels[1]]);
    const container = this.scene.add.container(0, 0, [inner]).setVisible(false);
    return { container, inner, body, wheels, spec: null, alpha: 0 };
  }

  /** Aligne les conteneurs sur l'état des véhicules : la pose vient uniquement du trajet. */
  sync(vehicles: readonly CrossVehicle[], seconds: number) {
    this.debug?.clear();
    vehicles.forEach((vehicle, index) => {
      const objects = this.objects[index];
      if (!objects) return;
      if (!vehicle.active) {
        objects.container.setVisible(false);
        objects.alpha = 0;
        return;
      }
      if (objects.spec !== vehicle.spec) this.configure(objects, vehicle.spec);
      const ideal = crossViewForHeading(vehicle.heading);
      const idealSide = ideal === "side-left" || ideal === "side-right";
      // Profil projeté : flanc parallèle à l'axe de la chaussée, verticales conservées (cisaillement, pas rotation).
      const profile = profilePose(vehicle.heading, vehicle.scale);
      objects.alpha = Phaser.Math.Clamp(objects.alpha + FADE_RATE * seconds, 0, 1);
      const display = vehicleDisplay(vehicle.spec);
      objects.container
        .setPosition(vehicle.x, vehicle.y)
        .setRotation(profile.outerRotation)
        .setScale(profile.scaleX, profile.scaleY)
        .setDepth(6 + vehicle.y / 1000);
      objects.container.setVisible(true).setAlpha(objects.alpha);
      objects.inner.setRotation(profile.innerRotation);
      const flipped = needsMirror(vehicle.spec, !profile.west);
      objects.body.setFlipX(flipped).setVisible(true);
      // Les roues tournent proportionnellement à la distance parcourue, dans le sens de la marche.
      const direction = profile.west ? -1 : 1;
      for (const wheelIndex of [0, 1] as const) {
        const offset = wheelOffset(display, wheelIndex, flipped);
        objects.wheels[wheelIndex]
          .setPosition(offset.x, offset.y)
          .setFlipX(flipped)
          .setRotation(rollAngle(direction * vehicle.rolled, vehicle.rollRadius))
          .setVisible(true);
      }
      if (this.debug && !idealSide) {
        // Diagnostic uniquement : la vue idéale (trois-quarts avant) manque pour ce cap.
        const length = vehicle.length;
        const depth = display.footprintDepth * vehicle.scale;
        this.debug.lineStyle(2, 0xffd83d, 1);
        const cos = Math.cos(vehicle.heading);
        const sin = Math.sin(vehicle.heading);
        const corners: Array<[number, number]> = [[length / 2, -depth / 2], [length / 2, depth / 2], [-length / 2, depth / 2], [-length / 2, -depth / 2]];
        this.debug.beginPath();
        corners.forEach(([cx, cy], i) => {
          const x = vehicle.x + cx * cos - cy * sin;
          const y = vehicle.y + cx * sin + cy * cos;
          if (i === 0) this.debug?.moveTo(x, y); else this.debug?.lineTo(x, y);
        });
        this.debug.closePath();
        this.debug.strokePath();
      }
    });
  }

  private configure(objects: CrossObjects, spec: VehicleSpec) {
    const display = vehicleDisplay(spec);
    objects.body
      .setTexture(spec.textureKey)
      .setOrigin(display.origin.x, display.origin.y)
      .setDisplaySize(display.width, display.height)
      .setPosition(0, display.offsetY);
    objects.wheels.forEach((disc, index) => {
      disc.setTexture(wheelTextureKey(spec, index)).setDisplaySize(display.wheels[index].discRadius * 2, display.wheels[index].discRadius * 2);
    });
    objects.spec = spec;
  }
}
