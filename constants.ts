
import { UnitType, BuildingType } from './types';

export const MAP_SIZE = 4000;
export const GRID_SIZE = 50;
export const TILE_SIZE = 64;

export const TERRAIN_COLORS = {
  GROUND: '#9d866a', // Slightly warmer dusty brown
  PIT: '#6e5e4e',    // Deep excavated earth
  PIT_BENCH: '#5a4d40', // Stepped shadow color
  WATER: '#233d32',  // Murky algae green
  WATER_SHORE: '#4a5d54', // Transition color for water
  ROAD: '#b5a18a',   // Lighter packed dirt
  STOCKPILE: '#ccc1b0' // Light grey/beige for stone piles
};

export const UNIT_CONFIGS = {
  [UnitType.EXCAVATOR]: {
    cost: 500,
    speed: 1.5,
    maxHealth: 100,
    cargoMax: 50,
    color: '#fbbf24', 
    icon: '🚜'
  },
  [UnitType.HAULER]: {
    cost: 300,
    speed: 2.5,
    maxHealth: 80,
    cargoMax: 200,
    color: '#f59e0b', 
    icon: '🚛'
  },
  [UnitType.SURVEYOR]: {
    cost: 200,
    speed: 4.0,
    maxHealth: 50,
    cargoMax: 0,
    color: '#60a5fa', 
    icon: '🛰️'
  }
};

export const BUILDING_CONFIGS = {
  [BuildingType.HQ]: {
    cost: 2000,
    maxHealth: 1000,
    color: '#374151', 
    icon: '🏢'
  },
  [BuildingType.CRUSHER]: {
    cost: 800,
    maxHealth: 500,
    color: '#1f2937', 
    icon: '🏗️'
  },
  [BuildingType.MAINTENANCE_BAY]: {
    cost: 1000,
    maxHealth: 600,
    color: '#1e3a8a', 
    icon: '🛠️'
  },
  [BuildingType.POWER_PLANT]: {
    cost: 600,
    maxHealth: 400,
    color: '#065f46', 
    icon: '⚡'
  }
};

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

export const UPGRADE_CONFIGS: UpgradeConfig[] = [
  {
    id: 'IMPROVED_DRILLS',
    name: 'Tungsten Drill Bits',
    description: 'Increases Excavator mining speed by 50%.',
    cost: 1500,
    icon: '🔩'
  },
  {
    id: 'REINFORCED_PLATING',
    name: 'Steel Reinforced Plating',
    description: 'Increases Building durability by 50%.',
    cost: 2000,
    icon: '🛡️'
  },
  {
    id: 'HAULER_CAPACITY',
    name: 'Expanded Truck Beds',
    description: 'Increases Hauler cargo capacity by 25%.',
    cost: 1200,
    icon: '📦'
  }
];
