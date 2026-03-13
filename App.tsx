
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GameState, 
  UnitType, 
  BuildingType, 
  EntityType, 
  Unit, 
  Building, 
  Resource, 
  ResourceType, 
  Position 
} from './types';
import { 
  UNIT_CONFIGS, 
  BUILDING_CONFIGS, 
  MAP_SIZE,
  UPGRADE_CONFIGS
} from './constants';
import GameCanvas from './components/GameCanvas';
import Sidebar from './components/Sidebar';
import { getMissionBriefing } from './services/geminiService';

const INITIAL_RESOURCES: Resource[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `res-sw-${i}`, type: EntityType.RESOURCE, subType: ResourceType.STONE,
    pos: { x: -1200 + Math.random() * 400, y: 300 + Math.random() * 400 },
    amount: 1000, health: 100, maxHealth: 100, team: 'neutral'
  } as Resource)),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `res-nw-${i}`, type: EntityType.RESOURCE, subType: ResourceType.ORE,
    pos: { x: -1400 + Math.random() * 300, y: -600 + Math.random() * 300 },
    amount: 1500, health: 100, maxHealth: 100, team: 'neutral'
  } as Resource))
];

const INITIAL_STATE: GameState = {
  credits: 5000,
  power: 100,
  units: [],
  buildings: [
    {
      id: 'hq-1', type: EntityType.BUILDING, subType: BuildingType.HQ,
      pos: { x: 1000, y: 0 }, health: 1000, maxHealth: 1000,
      team: 'player', isBuilt: true, progress: 100
    }
  ],
  resources: INITIAL_RESOURCES,
  selection: [],
  camera: { x: 400, y: 0 },
  zoom: 0.5,
  upgrades: []
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [briefing, setBriefing] = useState("Establishing connection to Woema Sector...");
  const gameStateRef = useRef<GameState>(gameState);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Main Game Loop
  useEffect(() => {
    const tick = setInterval(() => {
      setGameState(prev => {
        let newCredits = prev.credits;
        
        // Multipliers from upgrades
        const miningSpeedMultiplier = prev.upgrades.includes('IMPROVED_DRILLS') ? 1.5 : 1.0;
        const buildingHealthMultiplier = prev.upgrades.includes('REINFORCED_PLATING') ? 1.5 : 1.0;
        const haulerCapacityMultiplier = prev.upgrades.includes('HAULER_CAPACITY') ? 1.25 : 1.0;

        // 1. Building Construction Logic
        const nextBuildings = prev.buildings.map(b => {
          // Adjust max health if upgrade is present
          const baseMax = BUILDING_CONFIGS[b.subType].maxHealth;
          const upgradedMax = baseMax * buildingHealthMultiplier;
          
          if (b.isBuilt) {
            return { ...b, maxHealth: upgradedMax };
          }
          const newProgress = Math.min(100, b.progress + 0.5);
          return { 
            ...b, 
            progress: newProgress, 
            isBuilt: newProgress >= 100,
            maxHealth: upgradedMax,
            health: newProgress >= 100 ? upgradedMax : b.health
          };
        });

        // 2. Unit AI & Movement
        const nextUnits = prev.units.map(u => {
          let nextU = { ...u };
          
          // Apply hauler capacity upgrade
          if (nextU.subType === UnitType.HAULER) {
            nextU.cargoMax = UNIT_CONFIGS[UnitType.HAULER].cargoMax * haulerCapacityMultiplier;
          }
          
          // --- Sophisticated Movement & Local Avoidance ---
          if (nextU.targetPos) {
            const dx = nextU.targetPos.x - nextU.pos.x;
            const dy = nextU.targetPos.y - nextU.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 8) {
              let vx = (dx / dist);
              let vy = (dy / dist);

              prev.units.forEach(other => {
                if (other.id === nextU.id) return;
                const adx = nextU.pos.x - other.pos.x;
                const ady = nextU.pos.y - other.pos.y;
                const adist = Math.sqrt(adx * adx + ady * ady);
                if (adist < 50) {
                  const force = (50 - adist) / 50;
                  vx += (adx / adist) * force * 2;
                  vy += (ady / adist) * force * 2;
                }
              });

              const speedScale = nextU.speed * (nextU.cargo > 0 ? 0.6 : 1.0);
              const mag = Math.sqrt(vx * vx + vy * vy);
              nextU.pos.x += (vx / mag) * speedScale;
              nextU.pos.y += (vy / mag) * speedScale;

              const targetRotation = Math.atan2(vy, vx);
              let angleDiff = targetRotation - nextU.rotation;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              nextU.rotation += angleDiff * 0.15;
            } else {
              if (nextU.task === 'moving') { 
                nextU.targetPos = undefined; 
                nextU.task = 'idle'; 
              }
            }
          } else {
            nextU.rotation += Math.sin(Date.now() * 0.001 + nextU.id.length) * 0.005;
          }

          // --- Sophisticated Task Logic & Smart Idle ---
          
          if (nextU.subType === UnitType.EXCAVATOR) {
            if (nextU.task === 'idle') {
              const nearestRes = prev.resources
                .filter(r => r.amount > 0)
                .sort((a, b) => Math.hypot(a.pos.x - nextU.pos.x, a.pos.y - nextU.pos.y) - Math.hypot(b.pos.x - nextU.pos.x, b.pos.y - nextU.pos.y))[0];
              
              if (nearestRes && Math.hypot(nearestRes.pos.x - nextU.pos.x, nearestRes.pos.y - nextU.pos.y) < 800) {
                nextU.task = 'mining';
                nextU.assignedResourceId = nearestRes.id;
              }
            }

            if (nextU.task === 'mining' && nextU.assignedResourceId) {
              const resource = prev.resources.find(r => r.id === nextU.assignedResourceId);
              if (resource && resource.amount > 0) {
                const dist = Math.hypot(resource.pos.x - nextU.pos.x, resource.pos.y - nextU.pos.y);
                if (dist < 70) {
                  nextU.targetPos = undefined;
                  if (nextU.cargo < nextU.cargoMax) {
                    // Mining speed modified by upgrade
                    nextU.cargo = Math.min(nextU.cargoMax, nextU.cargo + (0.3 * miningSpeedMultiplier));
                    nextU.cargoType = resource.subType;
                  }
                } else {
                  nextU.targetPos = resource.pos;
                }
              } else {
                nextU.task = 'idle';
                nextU.assignedResourceId = undefined;
              }
            }
          }

          if (nextU.subType === UnitType.HAULER) {
            if (nextU.task === 'idle') {
              const callingExcavator = prev.units
                .filter(un => un.subType === UnitType.EXCAVATOR && un.cargo > 10)
                .filter(un => !prev.units.some(h => h.id !== nextU.id && h.subType === UnitType.HAULER && h.assignedUnitId === un.id))
                .sort((a, b) => b.cargo - a.cargo)[0];
              
              if (callingExcavator) {
                nextU.task = 'loading';
                nextU.assignedUnitId = callingExcavator.id;
              }
            }

            if (nextU.task === 'loading' && nextU.assignedUnitId) {
              const excavator = prev.units.find(un => un.id === nextU.assignedUnitId);
              if (excavator) {
                const dist = Math.hypot(excavator.pos.x - nextU.pos.x, excavator.pos.y - nextU.pos.y);
                if (dist < 70) {
                  if (excavator.cargo > 0 && nextU.cargo < nextU.cargoMax) {
                    const transferRate = 3;
                    nextU.cargo = Math.min(nextU.cargoMax, nextU.cargo + transferRate);
                    nextU.cargoType = excavator.cargoType;
                  } else if (nextU.cargo >= nextU.cargoMax || (excavator.cargo <= 0 && nextU.cargo > 0)) {
                    const dropoff = prev.buildings
                      .filter(b => b.isBuilt && (b.subType === BuildingType.CRUSHER || b.subType === BuildingType.HQ))
                      .sort((a, b) => Math.hypot(a.pos.x - nextU.pos.x, a.pos.y - nextU.pos.y) - Math.hypot(b.pos.x - nextU.pos.x, b.pos.y - nextU.pos.y))[0];
                    if (dropoff) {
                      nextU.task = 'delivering';
                      nextU.assignedBuildingId = dropoff.id;
                      nextU.targetPos = dropoff.pos;
                    }
                  }
                } else {
                  nextU.targetPos = excavator.pos;
                }
              } else {
                nextU.task = 'idle';
                nextU.assignedUnitId = undefined;
              }
            }

            if (nextU.task === 'delivering' && nextU.assignedBuildingId) {
              const building = prev.buildings.find(b => b.id === nextU.assignedBuildingId);
              if (building) {
                const dist = Math.hypot(building.pos.x - nextU.pos.x, building.pos.y - nextU.pos.y);
                if (dist < 100) {
                  const val = nextU.cargoType === ResourceType.ORE ? 18 : 6;
                  newCredits += nextU.cargo * val;
                  nextU.cargo = 0;
                  if (nextU.assignedUnitId) {
                    nextU.task = 'loading';
                    const targetU = prev.units.find(u_ => u_.id === nextU.assignedUnitId);
                    if (targetU) nextU.targetPos = targetU.pos;
                  } else {
                    nextU.task = 'idle';
                  }
                }
              } else {
                nextU.task = 'idle';
              }
            }
          }

          return nextU;
        });

        nextUnits.forEach(u => {
          if (u.subType === UnitType.HAULER && u.task === 'loading' && u.assignedUnitId) {
            const exIndex = nextUnits.findIndex(ex => ex.id === u.assignedUnitId);
            if (exIndex !== -1 && nextUnits[exIndex].cargo > 0) {
              const transfer = Math.min(nextUnits[exIndex].cargo, 3);
              nextUnits[exIndex].cargo -= transfer;
            }
          }
        });

        const nextResources = prev.resources.map(res => {
          const miners = nextUnits.filter(u => u.task === 'mining' && u.assignedResourceId === res.id && Math.hypot(res.pos.x - u.pos.x, res.pos.y - u.pos.y) < 70);
          // Mining depletion rate matches speed
          return { ...res, amount: Math.max(0, res.amount - miners.length * (0.3 * miningSpeedMultiplier)) };
        }).filter(res => res.amount > 0);

        return {
          ...prev,
          units: nextUnits,
          buildings: nextBuildings,
          resources: nextResources,
          credits: newCredits
        };
      });
    }, 50);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    getMissionBriefing("Automation systems online. Assets will now self-task to the nearest efficient operations. Manage your fleet ratio carefully: more haulers for deep pit work, more excavators for wide faces.")
      .then(res => setBriefing(res));
  }, []);

  const handleEntityClick = (id: string, shift: boolean) => {
    setGameState(prev => ({
      ...prev,
      selection: shift ? (prev.selection.includes(id) ? prev.selection.filter(sid => sid !== id) : [...prev.selection, id]) : [id]
    }));
  };

  const handleMapRightClick = (pos: Position) => {
    setGameState(prev => {
      const clickedRes = prev.resources.find(r => Math.hypot(r.pos.x - pos.x, r.pos.y - pos.y) < 60);
      const clickedUnit = prev.units.find(u => Math.hypot(u.pos.x - pos.x, u.pos.y - pos.y) < 50 && u.subType === UnitType.EXCAVATOR);
      const clickedBuilding = prev.buildings.find(b => b.isBuilt && Math.hypot(b.pos.x - pos.x, b.pos.y - pos.y) < 100);

      const nextUnits = prev.units.map(u => {
        if (!prev.selection.includes(u.id)) return u;

        if (u.subType === UnitType.EXCAVATOR) {
          if (clickedRes) return { ...u, task: 'mining', assignedResourceId: clickedRes.id, targetPos: clickedRes.pos };
          return { ...u, targetPos: pos, task: 'moving', assignedResourceId: undefined };
        }

        if (u.subType === UnitType.HAULER) {
          if (clickedUnit) return { ...u, task: 'loading', assignedUnitId: clickedUnit.id, targetPos: clickedUnit.pos };
          if (u.cargo > 0 && clickedBuilding) return { ...u, task: 'delivering', assignedBuildingId: clickedBuilding.id, targetPos: clickedBuilding.pos };
          return { ...u, targetPos: pos, task: 'moving', assignedUnitId: undefined, assignedBuildingId: undefined };
        }

        return { ...u, targetPos: pos, task: 'moving' };
      });

      return { ...prev, units: nextUnits };
    });
  };

  const handleBuildUnit = (type: UnitType) => {
    const config = UNIT_CONFIGS[type];
    if (gameState.credits < config.cost) return;
    setGameState(prev => {
      const hq = prev.buildings.find(b => b.subType === BuildingType.HQ && b.isBuilt);
      if (!hq) return prev;
      
      const haulerCapacityMultiplier = prev.upgrades.includes('HAULER_CAPACITY') ? 1.25 : 1.0;
      const cargoMax = type === UnitType.HAULER ? config.cargoMax * haulerCapacityMultiplier : config.cargoMax;

      const newUnit: Unit = {
        id: `unit-${Date.now()}-${Math.random()}`, type: EntityType.UNIT, subType: type,
        pos: { x: hq.pos.x + 120, y: hq.pos.y + 120 },
        health: config.maxHealth, maxHealth: config.maxHealth, team: 'player',
        speed: config.speed, rotation: 0, cargo: 0, cargoMax: cargoMax, task: 'idle'
      };
      return { ...prev, credits: prev.credits - config.cost, units: [...prev.units, newUnit] };
    });
  };

  const handleBuildBuilding = (type: BuildingType) => {
    const config = BUILDING_CONFIGS[type];
    if (gameState.credits < config.cost) return;
    setGameState(prev => {
      const buildingHealthMultiplier = prev.upgrades.includes('REINFORCED_PLATING') ? 1.5 : 1.0;
      const upgradedMax = config.maxHealth * buildingHealthMultiplier;
      
      return {
        ...prev,
        credits: prev.credits - config.cost,
        buildings: [...prev.buildings, {
          id: `b-${Date.now()}-${Math.random()}`, type: EntityType.BUILDING, subType: type,
          pos: { x: prev.camera.x, y: prev.camera.y },
          health: upgradedMax, maxHealth: upgradedMax, team: 'player', 
          isBuilt: false, progress: 0
        }]
      };
    });
  };

  const handleResearchUpgrade = (id: string) => {
    const config = UPGRADE_CONFIGS.find(u => u.id === id);
    if (!config || gameState.credits < config.cost || gameState.upgrades.includes(id)) return;
    
    setGameState(prev => ({
      ...prev,
      credits: prev.credits - config.cost,
      upgrades: [...prev.upgrades, id]
    }));
    
    getMissionBriefing(`New technology deployed: ${config.name}. Foreman, the site efficiency just spiked.`).then(res => setBriefing(res));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const speed = 50 / gameStateRef.current.zoom;
    setGameState(prev => {
      const cam = { ...prev.camera };
      if (e.key === 'w') cam.y -= speed; if (e.key === 's') cam.y += speed;
      if (e.key === 'a') cam.x -= speed; if (e.key === 'd') cam.x += speed;
      let zoom = prev.zoom;
      if (e.key === '=') zoom = Math.min(zoom + 0.1, 2); if (e.key === '-') zoom = Math.max(zoom - 0.2, 0.1);
      return { ...prev, camera: cam, zoom };
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-900 select-none font-sans">
      <GameCanvas gameState={gameState} setGameState={setGameState} onEntityClick={handleEntityClick} onMapRightClick={handleMapRightClick} />
      <Sidebar 
        gameState={gameState} 
        onBuildUnit={handleBuildUnit} 
        onBuildBuilding={handleBuildBuilding} 
        onResearchUpgrade={handleResearchUpgrade}
        briefing={briefing} 
      />
      
      <div className="fixed top-6 left-6 z-20 pointer-events-none flex flex-col gap-2">
        <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700 p-4 rounded-xl shadow-2xl">
          <div className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mb-2">Operations Control - Sector Woema</div>
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-2xl font-mono text-white leading-none tracking-tighter">§{Math.floor(gameState.credits).toLocaleString()}</span>
              <span className="text-[10px] text-neutral-500 font-bold uppercase mt-1">Operational Budget</span>
            </div>
            <div className="w-px h-10 bg-neutral-700"></div>
            <div className="flex flex-col">
              <span className="text-lg font-mono text-amber-400 leading-none">
                {gameState.units.filter(u => u.subType === UnitType.EXCAVATOR).length} / {gameState.units.filter(u => u.subType === UnitType.HAULER).length}
              </span>
              <span className="text-[10px] text-neutral-500 font-bold uppercase mt-1">E/H RATIO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
