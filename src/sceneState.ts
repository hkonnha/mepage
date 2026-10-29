/** Shared state written by the scroll handler and read by the 3D scene every frame. */
export const sceneState = {
  /** Horizontal position of the head as a fraction of viewport width. */
  x: 0.77,
  /** Extra turn of the head in radians, driven by the hero transition. */
  spin: 0,
  /** How far the head has been carried up with the scrolling hero, in viewport heights. */
  lift: 0,
  /** Hero transition progress, 0 (home) to 1 (white panel fully in). */
  progress: 0,
  /** False until the boot sequence finishes; the head sleeps until then. */
  awake: false,
};
