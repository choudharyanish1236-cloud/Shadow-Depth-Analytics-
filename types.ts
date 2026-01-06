
export enum ProximityLabel {
  TOUCHING = 'Touching',
  NEAR = 'Near',
  AWAY = 'Away'
}

export interface GeometryState {
  L: number;       // Distance from light to face (cm)
  h: number;       // Distance from hand to face (cm)
  A_hand: number;  // Area of hand in pixels/units^2
}

export interface PredictionResult {
  h_est: number;
  label: ProximityLabel;
  confidence: number;
  A_shadow: number;
}
