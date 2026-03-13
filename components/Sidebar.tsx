
import React from 'react';
import { GameState, BuildingType, UnitType } from '../types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, UPGRADE_CONFIGS } from '../constants';

interface SidebarProps {
  gameState: GameState;
  onBuildUnit: (type: UnitType) => void;
  onBuildBuilding: (type: BuildingType) => void;
  onResearchUpgrade: (id: string) => void;
  briefing: string;
}

const Sidebar: React.FC<SidebarProps> = ({ gameState, onBuildUnit, onBuildBuilding, onResearchUpgrade, briefing }) => {
  const selectedUnits = gameState.units.filter(u => gameState.selection.includes(u.id));
  const selectedBuildings = gameState.buildings.filter(b => gameState.selection.includes(b.id));

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-neutral-900 border-l border-neutral-700 p-4 text-white overflow-y-auto no-select z-10 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-black text-amber-500 tracking-tighter uppercase mb-1">Quarry Operations</h2>
        <div className="flex gap-4 items-center">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-400 uppercase font-bold">Credits</span>
            <span className="text-lg font-mono text-green-400">§ {gameState.credits.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-neutral-400 uppercase font-bold">Power</span>
            <span className="text-lg font-mono text-blue-400">{gameState.power} kW</span>
          </div>
        </div>
      </div>

      <div className="mb-6 bg-neutral-800 p-3 rounded-lg border border-neutral-700">
        <h3 className="text-xs font-bold text-neutral-400 uppercase mb-2">Ops Chief Briefing</h3>
        <p className="text-sm italic leading-relaxed text-neutral-300">"{briefing}"</p>
      </div>

      <div className="space-y-6">
        {/* Unit Construction */}
        <div>
          <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 border-b border-neutral-700 pb-1">Unit Assembly</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(UnitType).map(type => {
              const config = UNIT_CONFIGS[type];
              const canAfford = gameState.credits >= config.cost;
              return (
                <button
                  key={type}
                  onClick={() => onBuildUnit(type)}
                  disabled={!canAfford}
                  className={`flex flex-col items-center p-2 rounded border transition-all ${
                    canAfford ? 'border-neutral-600 bg-neutral-800 hover:bg-neutral-700' : 'border-red-900 opacity-50 cursor-not-allowed'
                  }`}
                  title={`${type}: §${config.cost}`}
                >
                  <span className="text-2xl mb-1">{config.icon}</span>
                  <span className="text-[10px] font-bold uppercase truncate w-full text-center">{type}</span>
                  <span className="text-[10px] text-green-400">§{config.cost}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Building Construction */}
        <div>
          <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 border-b border-neutral-700 pb-1">Infrastructure</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(BuildingType).map(type => {
              const config = BUILDING_CONFIGS[type];
              const canAfford = gameState.credits >= config.cost;
              return (
                <button
                  key={type}
                  onClick={() => onBuildBuilding(type)}
                  disabled={!canAfford}
                  className={`flex items-center gap-3 p-2 rounded border transition-all ${
                    canAfford ? 'border-neutral-600 bg-neutral-800 hover:bg-neutral-700' : 'border-red-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-xl">{config.icon}</span>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[10px] font-bold uppercase truncate w-full">{type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-green-400">§{config.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Research System */}
        <div>
          <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 border-b border-neutral-700 pb-1">Research & Development</h3>
          <div className="space-y-2">
            {UPGRADE_CONFIGS.map(upgrade => {
              const isResearched = gameState.upgrades.includes(upgrade.id);
              const canAfford = gameState.credits >= upgrade.cost;
              return (
                <button
                  key={upgrade.id}
                  onClick={() => onResearchUpgrade(upgrade.id)}
                  disabled={isResearched || !canAfford}
                  className={`w-full flex items-center gap-3 p-2 rounded border transition-all text-left ${
                    isResearched 
                      ? 'border-green-800 bg-green-900/20 opacity-90 cursor-default' 
                      : canAfford 
                        ? 'border-neutral-600 bg-neutral-800 hover:bg-neutral-700' 
                        : 'border-red-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-xl">{isResearched ? '✅' : upgrade.icon}</span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold uppercase">{upgrade.name}</span>
                    <span className="text-[9px] text-neutral-400 leading-tight">{upgrade.description}</span>
                    {!isResearched && <span className="text-[10px] text-green-400 font-bold mt-1">§{upgrade.cost}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection Details */}
        <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700 mt-auto">
          <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3">Selection Details</h3>
          {selectedUnits.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{UNIT_CONFIGS[selectedUnits[0].subType].icon}</span>
                <div>
                  <div className="text-sm font-bold">{selectedUnits[0].subType} x{selectedUnits.length}</div>
                  <div className="text-xs text-neutral-400">HP: {Math.round(selectedUnits[0].health)}/{Math.round(selectedUnits[0].maxHealth)}</div>
                </div>
              </div>
              <div className="space-y-1">
                 <div className="text-[10px] uppercase font-bold text-neutral-500">Task: {selectedUnits[0].task || 'IDLE'}</div>
                 <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${(selectedUnits[0].health / selectedUnits[0].maxHealth) * 100}%` }}></div>
                 </div>
              </div>
            </div>
          ) : selectedBuildings.length > 0 ? (
            <div className="space-y-3">
               <div className="flex items-center gap-3">
                <span className="text-3xl">{BUILDING_CONFIGS[selectedBuildings[0].subType].icon}</span>
                <div>
                  <div className="text-sm font-bold">{selectedBuildings[0].subType}</div>
                  <div className="text-xs text-neutral-400">Integrity: {Math.round((selectedBuildings[0].health / selectedBuildings[0].maxHealth) * 100)}%</div>
                  <div className="text-[10px] text-neutral-500">HP: {Math.round(selectedBuildings[0].health)} / {Math.round(selectedBuildings[0].maxHealth)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 italic">No assets selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
