export type Unit = 'feet' | 'meters';
export type CopingSize = 0 | 12 | 16; // inches

export interface PoolModel {
  id: string;
  name: string;
  lengthFeet: number;
  widthFeet: number;
  imagePath: string;
}

export interface CustomPoolDimensions {
  lengthFeet: number;
  lengthInches: number;
  widthFeet: number;
  widthInches: number;
}

export interface PaverConfig {
  top: number; // in feet
  right: number;
  bottom: number;
  left: number;
  sameOnAllSides: boolean;
}

export const PREDEFINED_MODELS: PoolModel[] = [
  {
    id: 'azoria-topaze-8x14',
    name: 'Azoria Topaze 8x14',
    lengthFeet: 14,
    widthFeet: 8,
    imagePath: '/src/assets/pool-12x24.png', // Placeholder until actual image is uploaded
  },
  {
    id: 'azoria-topaze-12x20',
    name: 'Azoria Topaze 12x20',
    lengthFeet: 22.5, // 22'-6"
    widthFeet: 10.67, // 10'-8"
    imagePath: '/src/assets/pool-12x24.png', // Placeholder
  },
  {
    id: 'azoria-topaze-12x24',
    name: 'Azoria Topaze 12x24',
    lengthFeet: 23,
    widthFeet: 11,
    imagePath: '/src/assets/pool-12x24.png',
  },
  {
    id: 'azoria-topaze-12x26',
    name: 'Azoria Topaze 12x26',
    lengthFeet: 25,
    widthFeet: 11,
    imagePath: '/src/assets/pool-12x24.png', // Placeholder until actual image is uploaded
  },
];

export const feetToMeters = (feet: number): number => feet * 0.3048;
export const metersToFeet = (meters: number): number => meters / 0.3048;
export const inchesToFeet = (inches: number): number => inches / 12;
export const feetToInches = (feet: number): number => feet * 12;

export const formatDimension = (feet: number, unit: Unit): string => {
  if (unit === 'meters') {
    return `${feetToMeters(feet).toFixed(2)}m`;
  }
  
  const totalInches = Math.round(feet * 12);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  
  if (inches === 0) {
    return `${ft}'`;
  }
  return `${ft}'-${inches}"`;
};
