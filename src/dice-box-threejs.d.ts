declare module '@3d-dice/dice-box-threejs' {
  export interface DiceBoxOptions {
    assetPath?: string;
    sounds?: boolean;
    shadows?: boolean;
    theme_surface?: string;
    theme_colorset?: string;
    theme_material?: string;
    strength?: number;
    gravity_multiplier?: number;
  }
  export default class DiceBox {
    constructor(selector: string, options?: DiceBoxOptions);
    initialize(): Promise<void>;
    roll(notation: string): Promise<unknown>;
    clearDice(): void;
    running: boolean | number;
    renderer?: { dispose(): void };
  }
}
