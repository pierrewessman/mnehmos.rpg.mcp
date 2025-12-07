/**
 * terrain-patterns.ts
 * 
 * Procedural terrain pattern generators for consistent geometric layouts
 * Used by generate_terrain_patch and generate_terrain_pattern tools
 */

export interface TerrainPatternResult {
  obstacles: string[];      // "x,y" format
  water: string[];
  difficultTerrain: string[];
  props: Array<{
    position: string;
    label: string;
    heightFeet: number;
    propType: string;
    cover: string;
  }>;
}

/**
 * Generate a river valley pattern
 * Two parallel cliff walls with a wide river in the center
 */
export function generateRiverValley(
  originX: number,
  originY: number,
  width: number,
  height: number
): TerrainPatternResult {
  const obstacles: string[] = [];
  const water: string[] = [];
  
  // Calculate wall positions (at edges) and river center
  const westWallX = originX + 2;
  const eastWallX = originX + width - 3;
  const riverStartX = originX + Math.floor(width / 2) - 1;
  const riverWidth = 3;
  
  // Generate west cliff wall
  for (let y = originY; y < originY + height; y++) {
    obstacles.push(`${westWallX},${y}`);
    // Add some depth to cliff (2 tiles wide)
    obstacles.push(`${westWallX + 1},${y}`);
  }
  
  // Generate east cliff wall
  for (let y = originY; y < originY + height; y++) {
    obstacles.push(`${eastWallX},${y}`);
    obstacles.push(`${eastWallX - 1},${y}`);
  }
  
  // Generate river (3 tiles wide in center)
  for (let y = originY; y < originY + height; y++) {
    for (let dx = 0; dx < riverWidth; dx++) {
      water.push(`${riverStartX + dx},${y}`);
    }
  }
  
  // Add cliff props
  const props = [
    { position: `${westWallX},${originY + 2}`, label: 'West Cliff', heightFeet: 30, propType: 'structure', cover: 'full' },
    { position: `${eastWallX},${originY + 2}`, label: 'East Cliff', heightFeet: 30, propType: 'structure', cover: 'full' },
  ];
  
  return { obstacles, water, difficultTerrain: [], props };
}

/**
 * Generate a canyon pattern (horizontal walls)
 * Two parallel walls running east-west with a pass between
 */
export function generateCanyon(
  originX: number,
  originY: number,
  width: number,
  height: number
): TerrainPatternResult {
  const obstacles: string[] = [];
  
  // Calculate wall positions
  const northWallY = originY + 3;
  const southWallY = originY + height - 4;
  
  // Generate north wall
  for (let x = originX; x < originX + width; x++) {
    obstacles.push(`${x},${northWallY}`);
    obstacles.push(`${x},${northWallY - 1}`);
  }
  
  // Generate south wall
  for (let x = originX; x < originX + width; x++) {
    obstacles.push(`${x},${southWallY}`);
    obstacles.push(`${x},${southWallY + 1}`);
  }
  
  const props = [
    { position: `${originX + Math.floor(width/2)},${northWallY}`, label: 'North Canyon Wall', heightFeet: 25, propType: 'structure', cover: 'full' },
    { position: `${originX + Math.floor(width/2)},${southWallY}`, label: 'South Canyon Wall', heightFeet: 25, propType: 'structure', cover: 'full' },
  ];
  
  return { obstacles, water: [], difficultTerrain: [], props };
}

/**
 * Generate an arena pattern
 * Circular wall perimeter enclosing an open area
 */
export function generateArena(
  originX: number,
  originY: number,
  width: number,
  height: number
): TerrainPatternResult {
  const obstacles: string[] = [];
  
  const centerX = originX + Math.floor(width / 2);
  const centerY = originY + Math.floor(height / 2);
  const radius = Math.min(width, height) / 2 - 2;
  
  // Generate circular perimeter using Bresenham's circle algorithm approximation
  for (let angle = 0; angle < 360; angle += 5) {
    const rad = angle * Math.PI / 180;
    const x = Math.round(centerX + radius * Math.cos(rad));
    const y = Math.round(centerY + radius * Math.sin(rad));
    const key = `${x},${y}`;
    if (!obstacles.includes(key)) {
      obstacles.push(key);
    }
  }
  
  const props = [
    { position: `${centerX},${originY + 1}`, label: 'Arena North Gate', heightFeet: 15, propType: 'structure', cover: 'three-quarter' },
    { position: `${centerX},${originY + height - 2}`, label: 'Arena South Gate', heightFeet: 15, propType: 'structure', cover: 'three-quarter' },
  ];
  
  return { obstacles, water: [], difficultTerrain: [], props };
}

/**
 * Generate a mountain pass pattern
 * Narrowing corridor toward the center
 */
export function generateMountainPass(
  originX: number,
  originY: number,
  width: number,
  height: number
): TerrainPatternResult {
  const obstacles: string[] = [];
  const difficultTerrain: string[] = [];
  
  const centerY = originY + Math.floor(height / 2);
  
  // Generate narrowing walls
  for (let y = originY; y < originY + height; y++) {
    const distFromCenter = Math.abs(y - centerY);
    const wallOffset = Math.floor(distFromCenter / 3) + 3;
    
    // Left wall (narrows toward center)
    obstacles.push(`${originX + wallOffset},${y}`);
    
    // Right wall (mirrors left)
    obstacles.push(`${originX + width - wallOffset - 1},${y}`);
    
    // Add difficult terrain near walls (scree/rocks)
    if (distFromCenter > 2) {
      difficultTerrain.push(`${originX + wallOffset + 1},${y}`);
      difficultTerrain.push(`${originX + width - wallOffset - 2},${y}`);
    }
  }
  
  const props = [
    { position: `${originX + Math.floor(width/2)},${centerY}`, label: 'Pass Chokepoint', heightFeet: 5, propType: 'cover', cover: 'half' },
  ];
  
  return { obstacles, water: [], difficultTerrain, props };
}

/**
 * Get pattern generator by name
 */
export function getPatternGenerator(
  pattern: 'river_valley' | 'canyon' | 'arena' | 'mountain_pass'
): (originX: number, originY: number, width: number, height: number) => TerrainPatternResult {
  switch (pattern) {
    case 'river_valley': return generateRiverValley;
    case 'canyon': return generateCanyon;
    case 'arena': return generateArena;
    case 'mountain_pass': return generateMountainPass;
    default: return generateCanyon;
  }
}

export const PATTERN_DESCRIPTIONS = {
  river_valley: 'Parallel cliff walls on east/west edges with 3-wide river in center',
  canyon: 'Two parallel walls running east-west with open pass between',
  arena: 'Circular wall perimeter enclosing an open fighting area',
  mountain_pass: 'Narrowing corridor toward center, wider at edges'
};
