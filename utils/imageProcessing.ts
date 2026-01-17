
import { MASK_PARAMS } from '../constants';

export interface ShadowData {
  count: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  avgIntensity: number; // Average brightness of detected shadow pixels (0-255)
}

/**
 * Computes Otsu's threshold for an 8-bit grayscale image.
 * This finds the threshold that minimizes intra-class variance.
 */
const computeOtsuThreshold = (histogram: number[], totalPixels: number): number => {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  return threshold;
};

/**
 * Simplified RGB to Saturation (HSV model) calculation.
 * Returns value between 0 and 255.
 */
const getSaturation = (r: number, g: number, b: number): number => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return ((max - min) / max) * 255;
};

/**
 * Shadow Mask Generation with Otsu's Thresholding and HSV Saturation analysis.
 * Better distinguishes shadows from dark objects by analyzing brightness and color saturation.
 */
export const generateShadowMask = (ctx: CanvasRenderingContext2D, width: number, height: number): ShadowData => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const numPixels = width * height;
  
  const grayscale = new Uint8ClampedArray(numPixels);
  const histogram = new Array(256).fill(0);

  // 1. Grayscale Conversion and Histogram Building
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Perceptual grayscale
    const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    grayscale[i / 4] = gray;
    histogram[gray]++;
  }

  // 2. Compute Otsu Threshold
  const otsuThreshold = computeOtsuThreshold(histogram, numPixels);
  
  // Refine threshold: Shadows are generally dark, so we cap Otsu if it's too high
  // and set a minimum to ignore pure black noise.
  const finalThreshold = Math.min(Math.max(otsuThreshold, 30), 80);

  // 3. Mask Generation with Saturation Filter
  let shadowPixelCount = 0;
  let intensitySum = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const gray = grayscale[idx];
      
      const r = data[idx * 4];
      const g = data[idx * 4 + 1];
      const b = data[idx * 4 + 2];
      
      // Shadows should be dark (below dynamic threshold) 
      // AND relatively desaturated compared to dark colored objects
      const sat = getSaturation(r, g, b);
      
      // Shadow logic: Dark AND (Low Saturation OR Very Dark)
      // Dark objects often have high saturation even if dark (e.g., deep red)
      const isShadow = gray < finalThreshold && (sat < 60 || gray < 30);

      if (isShadow) {
        shadowPixelCount++;
        intensitySum += gray;
        
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Visual feedback (Black for shadow)
        data[idx * 4] = 0;
        data[idx * 4 + 1] = 0;
        data[idx * 4 + 2] = 0;
      } else {
        // Visual feedback (White for non-shadow)
        data[idx * 4] = 255;
        data[idx * 4 + 1] = 255;
        data[idx * 4 + 2] = 255;
      }
      data[idx * 4 + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    count: shadowPixelCount,
    minX: shadowPixelCount > 0 ? minX : 0,
    minY: shadowPixelCount > 0 ? minY : 0,
    maxX: shadowPixelCount > 0 ? maxX : 0,
    maxY: shadowPixelCount > 0 ? maxY : 0,
    avgIntensity: shadowPixelCount > 0 ? intensitySum / shadowPixelCount : 0
  };
};
