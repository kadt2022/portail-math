export interface ObjectCard {
  label: string;
  shape?: "circle" | "square" | "triangle" | "rectangle";
  color?: string;
  size?: number;
}

interface QuestionBase {
  id: string;
  promptKey: string;
  hintKey: string;
  explanationKey: string;
  reviewLessonId: string;
}

export type Question = QuestionBase & (
  | { kind: "choice"; choices: readonly string[]; answers: readonly string[]; cards?: readonly ObjectCard[] }
  | { kind: "select"; cards: readonly ObjectCard[]; answers: readonly number[] }
  | { kind: "order"; values: readonly string[]; answer: readonly string[]; lengths?: readonly number[] }
  | { kind: "number"; answer: number; visual?: readonly number[]; symbol?: string }
  | { kind: "build"; target: number; initial?: number; token?: string; fixed?: number }
  | { kind: "remove"; total: number; remove: number; token?: string }
  | { kind: "split"; total: number; ways: number; equal?: boolean; fixedLeft?: number }
  | { kind: "path"; target: readonly [number, number]; start?: readonly [number, number]; walls?: readonly string[] }
  | { kind: "position"; answer: string }
  | { kind: "pattern" }
  | { kind: "trace" }
  | { kind: "measure"; units: number }
  | { kind: "align" }
  | { kind: "balance" }
  | { kind: "capacity"; targets: readonly [number, number] }
  | { kind: "tens"; target: number; exchange?: boolean }
  | { kind: "house" }
  | { kind: "story"; total: number; remove: number }
  | { kind: "pair"; left: number; right: number; answer: string; choices?: readonly string[] }
);

export interface Response {
  text?: string;
  numbers?: readonly number[];
  values?: readonly string[];
}

export function isCorrect(question: Question, response: Response): boolean {
  if (!response || typeof response !== "object" || (response.text !== undefined && typeof response.text !== "string") || (response.numbers !== undefined && (!Array.isArray(response.numbers) || !Array.from(response.numbers).every(Number.isInteger))) || (response.values !== undefined && (!Array.isArray(response.values) || !Array.from(response.values).every((v) => typeof v === "string")))) return false;
  const nums = response.numbers ?? [];
  const values = response.values ?? [];
  switch (question.kind) {
    case "choice": return question.answers.includes(response.text ?? "");
    case "number": return response.text?.trim() !== "" && response.text !== undefined && Number(response.text) === question.answer;
    case "select": return nums.length === question.answers.length && question.answers.every((n) => nums.includes(n));
    case "order": return values.length === question.answer.length && values.every((v, i) => v === question.answer[i]);
    case "build": return nums[0] === question.target;
    case "remove": return nums.length === question.remove && new Set(nums).size === nums.length && nums.every((n) => n >= 0 && n < question.total);
    case "split": {
      if (nums.length !== question.ways * 2) return false;
      const pairs = Array.from({ length: question.ways }, (_, i) => [nums[i * 2], nums[i * 2 + 1]]);
      return pairs.every(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a + b === question.total && (!question.equal || a === b) && (question.fixedLeft === undefined || a === question.fixedLeft))
        && new Set(pairs.map(([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`)).size === question.ways;
    }
    case "path": return nums[0] === question.target[0] && nums[1] === question.target[1];
    case "position": return response.text === question.answer;
    case "pattern": return values.length === 6 && values[0] !== values[1] && values.every((v, i) => ["jaune","vert"].includes(v) && v === values[i % 2]);
    case "trace": {
      if (nums.length < 3 || nums.some((n) => n < 0 || n > 8) || nums[0] === nums[nums.length - 1]) return false;
      const [a, b] = nums;
      return nums.slice(2).some((c) => ((b % 3) - (a % 3)) * (Math.floor(c / 3) - Math.floor(a / 3)) !== (Math.floor(b / 3) - Math.floor(a / 3)) * ((c % 3) - (a % 3)));
    }
    case "measure": return nums.length === question.units && nums.every((n, i) => n === i);
    case "align": return nums[0] === 0 && nums[1] === 0;
    case "balance": return values.includes("stone") && values.includes("leaf") && response.text === "stone";
    case "capacity": return nums[0] === question.targets[0] && nums[1] === question.targets[1];
    case "tens": return nums[0] === Math.floor(question.target / 10) && nums[1] === question.target % 10 && (!question.exchange || nums[2] === 1);
    case "house": return values[0] === "triangle" && values[1] === "square" && values[2] === "rectangle" && values[3] === "circle";
    case "story": return Boolean(response.text) && nums.length === question.remove && new Set(nums).size === nums.length && nums.every((n) => n >= 0 && n < question.total);
    case "pair": return nums.length === Math.min(question.left,question.right) && new Set(nums).size === nums.length && nums.every((n) => n >= 0 && n < Math.min(question.left,question.right)) && response.text === question.answer;
  }
}

export function solutionResponse(question: Question): Response {
  switch (question.kind) {
    case "choice": return { text: question.answers[0] };
    case "number": return { text: String(question.answer) };
    case "select": return { numbers: question.answers };
    case "order": return { values: question.answer };
    case "build": return { numbers: [question.target] };
    case "remove": case "story": return { numbers: Array.from({ length: question.remove }, (_, i) => i), text: "mangues" };
    case "split": return { numbers: Array.from({ length: question.ways }, (_, i) => { const a = question.fixedLeft ?? (question.equal ? question.total / 2 : i); return [a, question.total - a]; }).flat() };
    case "path": return { numbers: question.target };
    case "position": return { text: question.answer };
    case "pattern": return { values: ["jaune", "vert", "jaune", "vert", "jaune", "vert"] };
    case "trace": return { numbers: [0, 4, 2] };
    case "measure": return { numbers: Array.from({ length: question.units }, (_, i) => i) };
    case "align": return { numbers: [0, 0] };
    case "balance": return { values: ["stone", "leaf"], text: "stone" };
    case "capacity": return { numbers: question.targets };
    case "tens": return { numbers: [Math.floor(question.target / 10), question.target % 10, ...(question.exchange ? [1] : [])] };
    case "house": return { values: ["triangle", "square", "rectangle", "circle"] };
    case "pair": return { numbers: Array.from({length:Math.min(question.left,question.right)},(_,i)=>i), text:question.answer };
  }
}
