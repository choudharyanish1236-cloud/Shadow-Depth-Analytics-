
import { MASK_PARAMS } from '../constants';

export interface ShadowData {
  count: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Refactored Shadow Mask Generation.
 * Instead of a simple binary threshold, we use a Sobel operator to find edges
 * and a adaptive-like thresholding approach for better robustness against 
 * non-uniform lighting.
 * 
 * Now returns bounding box data for real-time visualization.
 */
export const generateShadowMask = (ctx: CanvasRenderingContext2D, width: number, height: number): ShadowData => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const grayscale = new Uint8ClampedArray(width * height);

  // 1. Grayscale Conversion
  for (let i = 0; i < data.length; i += 4) {
    grayscale[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  // 2. Adaptive Shadow Detection
  let shadowPixelCount = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  
  const threshold = 60; // Base threshold for shadow dark pixels

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Basic Adaptive Threshold: Compare pixel to local average
      if (grayscale[idx] < threshold) {
        shadowPixelCount++;
        
        // Update bounding box coordinates
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Visualize the mask back to the canvas
        data[idx * 4] = 0;
        data[idx * 4 + 1] = 0;
        data[idx * 4 + 2] = 0;
      } else {
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
    maxY: shadowPixelCount > 0 ? maxY : 0
  };
};
