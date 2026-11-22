/** Tipagem mínima da API 1.1 do @3d-dice/dice-box usada pelo Hexatombe. */
declare module '@3d-dice/dice-box' {
  interface DiceBoxOptions {
    container?: string;
    assetPath: string;
    theme?: string;
    themeColor?: string;
    scale?: number;
    throwForce?: number;
    spinForce?: number;
    gravity?: number;
    settleTimeout?: number;
    enableShadows?: boolean;
    offscreen?: boolean;
  }
  export default class DiceBox {
    constructor(options: DiceBoxOptions);
    init(): Promise<void>;
    roll(notation: string): Promise<unknown>;
    clear(): void;
    updateConfig(options: Partial<DiceBoxOptions>): void;
  }
}
