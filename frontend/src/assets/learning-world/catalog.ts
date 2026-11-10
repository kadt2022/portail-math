import banknoteUrl from "./objects/banknote.svg";
import basketUrl from "./objects/basket.svg";
import bookUrl from "./objects/book.svg";
import cashRegisterUrl from "./objects/cash-register.svg";
import eraserUrl from "./objects/eraser.svg";
import mangoUrl from "./objects/mango.svg";
import marketStallObjectUrl from "./objects/market-stall.svg";
import notebookUrl from "./objects/notebook.svg";
import pencilUrl from "./objects/pencil.svg";
import walletUrl from "./objects/wallet.svg";
import marketEnvironmentUrl from "./environments/market-stall.webp";
import schoolShopEnvironmentUrl from "./environments/school-shop.webp";

import type {
  LearningEnvironmentDefinition,
  LearningEnvironmentId,
  LearningObjectDefinition,
  LearningObjectId,
} from "../../courses/components/learning-world/learning-world.types";

export const LEARNING_OBJECT_CATALOG: Record<LearningObjectId, LearningObjectDefinition> = {
  "fruit.mango": {
    id: "fruit.mango",
    category: "fruit",
    assetUrl: mangoUrl,
    altKey: "objects.mango",
    aspectRatio: 1,
    format: "svg",
    roles: ["countable", "movable"],
    provenance: "original",
    license: "project",
  },
  "container.basket": {
    id: "container.basket",
    category: "container",
    assetUrl: basketUrl,
    altKey: "objects.basket",
    aspectRatio: 160 / 130,
    format: "svg",
    roles: ["container"],
    provenance: "original",
    license: "project",
  },
  "school.notebook": {
    id: "school.notebook",
    category: "school",
    assetUrl: notebookUrl,
    altKey: "objects.notebook",
    aspectRatio: 1,
    format: "svg",
    roles: ["countable", "movable"],
    provenance: "original",
    license: "project",
  },
  "school.pencil": {
    id: "school.pencil",
    category: "school",
    assetUrl: pencilUrl,
    altKey: "objects.pencil",
    aspectRatio: 160 / 70,
    format: "svg",
    roles: ["countable", "movable"],
    provenance: "original",
    license: "project",
  },
  "school.eraser": {
    id: "school.eraser",
    category: "school",
    assetUrl: eraserUrl,
    altKey: "objects.eraser",
    aspectRatio: 130 / 90,
    format: "svg",
    roles: ["countable", "movable"],
    provenance: "original",
    license: "project",
  },
  "school.book": {
    id: "school.book",
    category: "school",
    assetUrl: bookUrl,
    altKey: "objects.book",
    aspectRatio: 140 / 120,
    format: "svg",
    roles: ["countable", "movable"],
    provenance: "original",
    license: "project",
  },
  "money.banknote": {
    id: "money.banknote",
    category: "money",
    assetUrl: banknoteUrl,
    altKey: "objects.banknote",
    aspectRatio: 1.8,
    format: "svg",
    roles: ["countable", "movable"],
    provenance: "original",
    license: "project",
  },
  "money.wallet": {
    id: "money.wallet",
    category: "money",
    assetUrl: walletUrl,
    altKey: "objects.wallet",
    aspectRatio: 150 / 115,
    format: "svg",
    roles: ["container", "movable"],
    provenance: "original",
    license: "project",
  },
  "shop.cash-register": {
    id: "shop.cash-register",
    category: "shop",
    assetUrl: cashRegisterUrl,
    altKey: "objects.cashRegister",
    aspectRatio: 150 / 130,
    format: "svg",
    roles: ["container", "movable"],
    provenance: "original",
    license: "project",
  },
  "shop.market-stall": {
    id: "shop.market-stall",
    category: "shop",
    assetUrl: marketStallObjectUrl,
    altKey: "objects.marketStall",
    aspectRatio: 1.2,
    format: "svg",
    roles: ["decorative"],
    provenance: "original",
    license: "project",
  },
};

export const LEARNING_ENVIRONMENT_CATALOG: Record<LearningEnvironmentId, LearningEnvironmentDefinition> = {
  "environment.market": {
    id: "environment.market",
    assetUrl: marketEnvironmentUrl,
    altKey: "environments.market",
    aspectRatio: 16 / 9,
    format: "webp",
    provenance: "openai-generated",
    license: "project",
  },
  "environment.school-shop": {
    id: "environment.school-shop",
    assetUrl: schoolShopEnvironmentUrl,
    altKey: "environments.schoolShop",
    aspectRatio: 16 / 9,
    format: "webp",
    provenance: "openai-generated",
    license: "project",
  },
};

export function getLearningObjectDefinition(id: LearningObjectId) {
  return LEARNING_OBJECT_CATALOG[id];
}

export function getLearningEnvironmentDefinition(id: LearningEnvironmentId) {
  return LEARNING_ENVIRONMENT_CATALOG[id];
}
