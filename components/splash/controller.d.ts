export interface SplashController {
  skip(): void;
  dispose(): void;
  holdFailsafe(): void;
  readonly animations: Animation[];
  readonly reduced: boolean;
  readonly destination?: "list";
  readonly active?: boolean;
  readonly ready?: boolean;
  tick?(): void;
}
export function startSplash(element: HTMLElement): SplashController | null;
export function toClimb(element: HTMLElement, switchView: () => void): SplashController;

export function toList(element: HTMLElement, switchView: () => void): SplashController;
