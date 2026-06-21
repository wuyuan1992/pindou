import { DEFAULT_TRANSFORMS, type ItemTransform } from "../store/useLayoutStore.ts";

export const BOARD_N = 20;
export const CELL = 1;
export const BOARD_SIZE = BOARD_N * CELL;
export const BOARD_HALF = BOARD_SIZE / 2;

export const BOARD_THICKNESS = 0.5;
export const BOARD_TOP_Y = BOARD_THICKNESS / 2;

export const PEG_RADIUS = 0.12;
export const PEG_HEIGHT = 1.5;
export const PEG_TOP_Y = BOARD_TOP_Y + PEG_HEIGHT;

export const BEAD_OUTER_R = 0.42;
export const BEAD_INNER_R = 0.15;
export const BEAD_HEIGHT = 1.4;
export const BEAD_TOP_Y = BOARD_TOP_Y + BEAD_HEIGHT;
export const BEAD_CENTER_Y = BOARD_TOP_Y + BEAD_HEIGHT / 2;

export const DRAG_PLANE_Y = PEG_TOP_Y + BEAD_HEIGHT + 0.3;

export const BOARD_COLOR = "#f4ecd8";
export const BOARD_EDGE_COLOR = "#d4c4a0";

export const GRID_PITCH = CELL;

export const BOARD_TRANSFORM = DEFAULT_TRANSFORMS.board;

export function localToWorld(
  transform: ItemTransform,
  lx: number,
  lz: number
): [number, number] {
  const c = Math.cos(transform.rotationY);
  const s = Math.sin(transform.rotationY);
  return [
    lx * c - lz * s + transform.position[0],
    lx * s + lz * c + transform.position[2],
  ];
}

export function worldToLocal(
  transform: ItemTransform,
  wx: number,
  wz: number
): [number, number] {
  const c = Math.cos(-transform.rotationY);
  const s = Math.sin(-transform.rotationY);
  const dx = wx - transform.position[0];
  const dz = wz - transform.position[2];
  return [dx * c - dz * s, dx * s + dz * c];
}

export function boardLocalToWorld(lx: number, lz: number): [number, number] {
  return localToWorld(BOARD_TRANSFORM, lx, lz);
}

export function boardWorldToLocal(wx: number, wz: number): [number, number] {
  return worldToLocal(BOARD_TRANSFORM, wx, wz);
}

export function gridToWorld(col: number, row: number): [number, number, number] {
  const x = col - (BOARD_N - 1) / 2;
  const z = row - (BOARD_N - 1) / 2;
  return [x, 0, z];
}

export function worldToGridFloor(x: number, z: number): { col: number; row: number } | null {
  const col = Math.round(x + (BOARD_N - 1) / 2);
  const row = Math.round(z + (BOARD_N - 1) / 2);
  if (col < 0 || col >= BOARD_N || row < 0 || row >= BOARD_N) return null;
  return { col, row };
}
