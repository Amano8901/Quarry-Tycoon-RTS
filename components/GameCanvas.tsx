
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, EntityType, Position, Unit, Building, Resource, UnitType, ResourceType } from '../types';
import { MAP_SIZE, TILE_SIZE, UNIT_CONFIGS, BUILDING_CONFIGS, TERRAIN_COLORS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onEntityClick: (id: string, shift: boolean) => void;
  onMapRightClick: (pos: Position) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onEntityClick, onMapRightClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [frame, setFrame] = useState(0);

  const screenToWorld = useCallback((screenX: number, screenY: number): Position => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - window.innerWidth / 2) / gameState.zoom + gameState.camera.x,
      y: (screenY - rect.top - window.innerHeight / 2) / gameState.zoom + gameState.camera.y
    };
  }, [gameState.camera, gameState.zoom]);

  const drawResourceNode = (ctx: CanvasRenderingContext2D, res: Resource) => {
    const isOre = res.subType === ResourceType.ORE;
    ctx.save();
    ctx.translate(res.pos.x, res.pos.y);

    const seed = parseInt(res.id.split('-').pop() || '0', 16) || 0;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seed;
      const dist = 8 + (seed % 5);
      const size = 10 + (seed % 8);
      
      ctx.fillStyle = isOre ? '#d97706' : '#6b7280';
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
      for(let j=0; j<5; j++) {
        const pAngle = angle + (j/5) * (Math.PI*2/count);
        const r = size * (0.8 + Math.random() * 0.4);
        ctx.lineTo(Math.cos(pAngle) * r, Math.sin(pAngle) * r);
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = isOre ? '#fbbf24' : '#9ca3af';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dist * 0.5, Math.sin(angle) * dist * 0.5, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isOre) {
      const shimmer = (Math.sin(frame * 0.05 + seed) + 1) / 2;
      if (shimmer > 0.8) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc((seed % 10) - 5, (seed % 8) - 4, 3 * shimmer, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.floor(res.amount).toString(), res.pos.x, res.pos.y - 35);
  };

  const drawHealthBar = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, percent: number, isConstruction: boolean = false) => {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 2);
    ctx.fill();

    ctx.fillStyle = isConstruction ? '#451a03' : '#7f1d1d';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 1);
    ctx.fill();

    const fillStyle = isConstruction ? '#fbbf24' : (percent > 0.5 ? '#22c55e' : percent > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(x, y, width * percent, height, 1);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, y, width, height / 2);
    ctx.restore();
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.save();
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(gameState.zoom, gameState.zoom);
    ctx.translate(-gameState.camera.x, -gameState.camera.y);

    ctx.fillStyle = TERRAIN_COLORS.GROUND;
    ctx.fillRect(-MAP_SIZE/2, -MAP_SIZE/2, MAP_SIZE, MAP_SIZE);

    const drawPitLayer = (x: number, y: number, w: number, h: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };

    drawPitLayer(-1650, -850, 2100, 1700, 60, TERRAIN_COLORS.PIT_BENCH);
    drawPitLayer(-1600, -800, 2000, 1600, 40, TERRAIN_COLORS.PIT);
    drawPitLayer(-1400, -600, 1400, 1200, 30, 'rgba(0,0,0,0.1)');

    const drawWaterBody = (x: number, y: number, rx: number, ry: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = TERRAIN_COLORS.WATER_SHORE;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + 10, ry + 10, 0, 0, Math.PI * 2);
      ctx.fill();
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      gradient.addColorStop(0, '#1a2e25');
      gradient.addColorStop(1, TERRAIN_COLORS.WATER);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawWaterBody(-400, -400, 200, 150, Math.PI/4);
    drawWaterBody(0, 300, 300, 200, -Math.PI/6);
    drawWaterBody(-1000, 100, 250, 180, 0);

    ctx.save();
    ctx.strokeStyle = TERRAIN_COLORS.ROAD;
    ctx.lineWidth = 90;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1000, 0);
    ctx.lineTo(1200, 200);
    ctx.stroke();
    ctx.restore();

    gameState.resources.forEach(res => drawResourceNode(ctx, res));

    gameState.buildings.forEach(b => {
      const config = BUILDING_CONFIGS[b.subType];
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.pos.x - 45, b.pos.y - 45, 110, 110);
      if (!b.isBuilt) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([10, 5]);
        ctx.lineWidth = 2;
        ctx.strokeRect(b.pos.x - 50, b.pos.y - 50, 100, 100);
      }
      ctx.fillStyle = config.color;
      const h = 100 * (b.progress / 100);
      ctx.fillRect(b.pos.x - 50, b.pos.y + 50 - h, 100, h);
      if (gameState.selection.includes(b.id)) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(b.pos.x - 55, b.pos.y - 55, 110, 110);
      }
      if (b.isBuilt) {
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(config.icon, b.pos.x, b.pos.y + 15);
      }
      if (!b.isBuilt) drawHealthBar(ctx, b.pos.x - 40, b.pos.y - 70, 80, 8, b.progress / 100, true);
      else if (gameState.selection.includes(b.id) || b.health < b.maxHealth) drawHealthBar(ctx, b.pos.x - 40, b.pos.y - 70, 80, 8, b.health / b.maxHealth, false);
      ctx.restore();
    });

    gameState.units.forEach(u => {
      const config = UNIT_CONFIGS[u.subType];
      ctx.save();
      ctx.translate(u.pos.x, u.pos.y);
      ctx.rotate(u.rotation); // Apply Unit Rotation
      
      const isSelected = gameState.selection.includes(u.id);

      if (isSelected) {
        ctx.save();
        ctx.rotate(-u.rotation); // Reset rotation for selection circle
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(-18, -18, 44, 44, 6);
      ctx.fill();

      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.roundRect(-20, -20, 40, 40, 6);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.rotate(-u.rotation); // Keep emoji upright if desired, or let it rotate
      ctx.fillText(config.icon, 0, 8);
      ctx.restore();

      if (u.cargo > 0) {
        ctx.save();
        ctx.rotate(-u.rotation);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-20, -28, 40 * (u.cargo / u.cargoMax), 4);
        ctx.restore();
      }
      
      if (isSelected || u.health < u.maxHealth) {
        ctx.save();
        ctx.rotate(-u.rotation);
        drawHealthBar(ctx, -20, -40, 40, 4, u.health / u.maxHealth, false);
        ctx.restore();
      }

      if (u.task && u.task !== 'idle') {
        ctx.save();
        ctx.rotate(-u.rotation);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(u.task.toUpperCase(), 0, 35);
        ctx.restore();
      }
      ctx.restore();
    });

    if (isSelecting && selectionStart) {
      const worldMouse = screenToWorld(mousePos.x, mousePos.y);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectionStart.x, selectionStart.y, worldMouse.x - selectionStart.x, worldMouse.y - selectionStart.y);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.fillRect(selectionStart.x, selectionStart.y, worldMouse.x - selectionStart.x, worldMouse.y - selectionStart.y);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [gameState, isSelecting, selectionStart, mousePos, screenToWorld, frame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    let animationId: number;
    const render = (time: number) => {
      setFrame(Math.floor(time));
      draw(ctx);
      animationId = requestAnimationFrame(render);
    };
    animationId = requestAnimationFrame(render);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const hitUnit = gameState.units.find(u => Math.hypot(u.pos.x - worldPos.x, u.pos.y - worldPos.y) < 25);
      const hitBuilding = gameState.buildings.find(b => Math.abs(b.pos.x - worldPos.x) < 50 && Math.abs(b.pos.y - worldPos.y) < 50);
      if (hitUnit || hitBuilding) {
        onEntityClick((hitUnit || hitBuilding)!.id, e.shiftKey);
      } else {
        setIsSelecting(true);
        setSelectionStart(worldPos);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 0 && isSelecting && selectionStart) {
      const worldEnd = screenToWorld(e.clientX, e.clientY);
      const minX = Math.min(selectionStart.x, worldEnd.x);
      const maxX = Math.max(selectionStart.x, worldEnd.x);
      const minY = Math.min(selectionStart.y, worldEnd.y);
      const maxY = Math.max(selectionStart.y, worldEnd.y);
      const selectedIds = gameState.units.filter(u => u.pos.x >= minX && u.pos.x <= maxX && u.pos.y >= minY && u.pos.y <= maxY).map(u => u.id);
      setGameState(prev => ({ ...prev, selection: selectedIds }));
      setIsSelecting(false);
      setSelectionStart(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onMapRightClick(screenToWorld(e.clientX, e.clientY));
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
};

export default GameCanvas;
