
import { ProximityLabel } from './types';

export const DEFAULT_L = 50;
export const DEFAULT_H = 5;
export const DEFAULT_A_HAND = 2000;

// Mask Generation Parameters (Simulating adaptive thresholding/edge detection)
export const MASK_PARAMS = {
  ADAPTIVE_BLOCK_SIZE: 11,
  ADAPTIVE_C: 2,
  CANNY_THRESHOLD_1: 50,
  CANNY_THRESHOLD_2: 150
};

export const getLabel = (h: number): ProximityLabel => {
  if (h < 2) return ProximityLabel.TOUCHING;
  if (h < 10) return ProximityLabel.NEAR;
  return ProximityLabel.AWAY;
};

export const getLabelColor = (label: ProximityLabel): string => {
  switch (label) {
    case ProximityLabel.TOUCHING: return 'bg-rose-500';
    case ProximityLabel.NEAR: return 'bg-amber-500';
    case ProximityLabel.AWAY: return 'bg-emerald-500';
    default: return 'bg-slate-500';
  }
};

export const calculateScale = (L: number, h: number): number => {
  const d_hand = Math.max(0.1, L - h);
  return L / d_hand;
};

export const calculateShadowArea = (A_hand: number, L: number, h: number): number => {
  const s = calculateScale(L, h);
  return A_hand * Math.pow(s, 2);
};

export const estimateH = (L: number, A_hand: number, A_shadow: number): number => {
  if (A_shadow <= 0 || A_hand <= 0) return L; 
  // Safety check: sqrt of area ratio
  const ratio = A_hand / A_shadow;
  if (ratio > 1) return 0; // Hand is "touching" or somehow the area is smaller (noise)
  const h = L - L * Math.sqrt(ratio);
  return Math.max(0, h);
};
