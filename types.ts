
export enum EntityType {
  UNIT = 'UNIT',
  BUILDING = 'BUILDING',
  RESOURCE = 'RESOURCE'
}

export enum UnitType {
  EXCAVATOR = 'EXCAVATOR',
  HAULER = 'HAULER',
  SURVEYOR = 'SURVEYOR'
}

export enum BuildingType {
  HQ = 'HQ',
  CRUSHER = 'CRUSHER',
  MAINTENANCE_BAY = 'MAINTENANCE_BAY',
  POWER_PLANT = 'POWER_PLANT'
}

export enum ResourceType {
  STONE = 'STONE',
  ORE = 'ORE'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  subType: UnitType | BuildingType | ResourceType;
  pos: Position;
  health: number;
  maxHealth: number;
  team: 'player' | 'neutral' | 'enemy';
  selected?: boolean;
}

export interface Unit extends Entity {
  type: EntityType.UNIT;
  subType: UnitType;
  targetPos?: Position;
  speed: number;
  rotation: number; // In radians
  cargo: number;
  cargoMax: number;
  cargoType?: ResourceType;
  task?: 'idle' | 'moving' | 'mining' | 'delivering' | 'loading';
  assignedResourceId?: string;
  assignedBuildingId?: string;
  assignedUnitId?: string; // For Haulers following Excavators
}

export interface Building extends Entity {
  type: EntityType.BUILDING;
  subType: BuildingType;
  isBuilt: boolean;
  progress: number; // 0 to 100
}

export interface Resource extends Entity {
  type: EntityType.RESOURCE;
  subType: ResourceType;
  amount: number;
}

export interface GameState {
  credits: number;
  power: number;
  units: Unit[];
  buildings: Building[];
  resources: Resource[];
  selection: string[];
  camera: Position;
  zoom: number;
  upgrades: string[]; // List of IDs of researched upgrades
}
