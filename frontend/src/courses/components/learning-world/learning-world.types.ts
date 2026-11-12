export type LearningObjectId =
  | "fruit.mango"
  | "fruit.orange"
  | "container.basket"
  | "school.notebook"
  | "school.pencil"
  | "school.eraser"
  | "school.book"
  | "money.banknote"
  | "money.wallet"
  | "shop.cash-register"
  | "shop.market-stall";

export type LearningEnvironmentId = "environment.market" | "environment.school-shop";

export interface LearningObjectDefinition {
  id: LearningObjectId;
  category: "fruit" | "container" | "school" | "money" | "shop";
  assetUrl: string;
  altKey: string;
  aspectRatio: number;
  format: "svg";
  roles: readonly ("countable" | "movable" | "container" | "decorative")[];
  provenance: "original";
  license: "project";
}

export interface LearningEnvironmentDefinition {
  id: LearningEnvironmentId;
  assetUrl: string;
  altKey: string;
  aspectRatio: number;
  format: "webp";
  provenance: "openai-generated";
  license: "project";
}

export interface LearningObjectInstance {
  instanceId: string;
  objectId: LearningObjectId;
}

export interface MoveLearningObjectAction {
  type: "move-object";
  objectInstanceId: string;
  fromZoneId: string;
  toZoneId: string;
}
