# ShadowDepth Analytics Pro

**ShadowDepth Analytics Pro** is a high-precision interactive geometric simulation and vision-based analysis tool. It leverages real-time computer vision and the physics of point-source light models to estimate the depth ($h$) of an object based on its projected shadow area ($A_{shadow}$).

![Optical Processor HUD](https://img.shields.io/badge/Processor-v3.1.0-emerald)
![Stability Engine](https://img.shields.io/badge/Stability-Locked-sky)
![AI Engine](https://img.shields.io/badge/AI-Gemini_3_Pro-indigo)

---

## 🚀 Overview

The application provides a "Laboratory HUD" environment where users can calibrate their camera to recognize a specific hand area, then simulate how distance from a light source impacts shadow projection. It bridges the gap between raw vision data and mathematical modeling.

### Core Features
- **Optical Processor HUD**: Real-time shadow masking using Otsu's thresholding and HSV saturation analysis to isolate shadows from dark objects.
- **Advanced Stability Engine**: Multi-heuristic logic that analyzes area standard deviation, bounding box jitter, and spatial consistency to ensure high-confidence measurements.
- **Calibration Wizard**: A step-by-step guided experience for establishing the `A_hand` baseline (the physical hand area when touching the surface).
- **Interactive Side-View Visualizer**: A dynamic SVG-based projection model showing light rays, hand position, and shadow scaling.
- **AI Intelligence Brief**: Integration with Google Gemini to provide technical analysis of geometric configurations and inverse square law implications.

---

## 🛠 Technical Specification

### The Physics Model
The estimation logic is based on the linear scaling of projection geometry:
$$S = \frac{L}{L - h}$$
$$A_{shadow} = A_{hand} \times S^2$$

Where:
- $L$: Distance from the Light source to the surface.
- $h$: Distance from the Hand to the surface.
- $A_{hand}$: Reference area (baseline).
- $A_{shadow}$: Measured shadow area.

### Vision Pipeline
1. **Grayscale Conversion**: Perceptual weight-based conversion.
2. **Otsu's Thresholding**: Dynamic calculation of optimal pixel intensity cutoff.
3. **Saturation Filter**: Desaturation checking to differentiate true shadows from dark-colored objects.
4. **Bounding Box Analysis**: Calculation of centroids and extents for jitter rejection.

---

## 💻 Setup & Installation

This project is built as an ES6 module-based React application.

### Requirements
- A modern web browser with **Camera API** support.
- A Google Gemini API Key (configured as `process.env.API_KEY`).

### Environment Variables
The application requires an API key for the AI Analysis feature:
```env
API_KEY=your_gemini_api_key_here
```

### Installation
1. Clone the repository.
2. Open `index.html` via a local web server (e.g., VS Code Live Server).
3. Ensure the browser has permission to access the camera.

---

## 🧭 Calibration Guide

1. **Launch Wizard**: Click the "Launch Wizard" button in the header.
2. **Clear Space**: Ensure the camera view is clear of objects to establish a zero-noise baseline.
3. **Measure Hand**: Place your hand flat against the surface. Wait for the **SIGNAL LOCKED** indicator (Emerald HUD).
4. **Store Baseline**: Click "Capture Area" and "Save & Exit". Your unique hand profile is now the reference for all depth simulations.

---

## ⚖️ License
Geometric Labs // Senior Frontend Engineering Team. Built for educational and analytical purposes.
