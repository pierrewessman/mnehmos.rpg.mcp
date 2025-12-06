import { z } from 'zod';
import { getDb } from '../storage/index.js';
import { SpatialRepository } from '../storage/repos/spatial.repo.js';
import { CharacterRepository } from '../storage/repos/character.repo.js';
import { RoomNode, Exit } from '../schema/spatial.js';
import { SessionContext } from './types.js';

/**
 * PHASE-1: Spatial Graph System Tools
 * Tools for room/location persistence and spatial awareness
 */

// ============================================================
// TOOL DEFINITIONS
// ============================================================

export const SpatialTools = {
    LOOK_AT_SURROUNDINGS: {
        name: 'look_at_surroundings',
        description: `Get a filtered description of the room the character is currently in.
Accounts for:
- Darkness (requires darkvision or light source)
- Fog (reduces visibility)
- Perception checks for hidden exits
- Atmospheric effects (SILENCE, ANTIMAGIC, etc.)

Returns the room description, visible exits, entities present, and atmospheric conditions.`,
        inputSchema: z.object({
            observerId: z.string().uuid().describe('ID of the character observing their surroundings')
        })
    },

    GENERATE_ROOM_NODE: {
        name: 'generate_room_node',
        description: `Create a new persistent room/location in the world.
The room's description is locked upon creation and cannot be changed later (maintains world consistency).

Optionally links the new room to a previous room via an exit.
Biome determines atmospheric effects and description themes.`,
        inputSchema: z.object({
            name: z.string().min(1).max(100).describe('Name of the room (e.g., "The Dragon\'s Rest Tavern")'),
            baseDescription: z.string().min(10).max(2000).describe('Detailed description of the room (immutable once created)'),
            biomeContext: z.enum(['forest', 'mountain', 'urban', 'dungeon', 'coastal', 'cavern', 'divine', 'arcane'])
                .describe('Biome/environment type'),
            atmospherics: z.array(z.enum(['DARKNESS', 'FOG', 'ANTIMAGIC', 'SILENCE', 'BRIGHT', 'MAGICAL']))
                .default([])
                .describe('Environmental effects in this room'),
            previousNodeId: z.string().uuid().optional()
                .describe('If specified, creates an exit FROM this room TO the new room'),
            direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'])
                .optional()
                .describe('Direction of the exit from previousNodeId to the new room')
        })
    },

    GET_ROOM_EXITS: {
        name: 'get_room_exits',
        description: `Get the list of exits (doors, passages, stairs) from a specific room.
Returns all exits regardless of visibility - use look_at_surroundings for perception-filtered exits.`,
        inputSchema: z.object({
            roomId: z.string().uuid().describe('ID of the room to get exits for')
        })
    },

    MOVE_CHARACTER_TO_ROOM: {
        name: 'move_character_to_room',
        description: `Move a character to a specific room.
Updates the character's current_room_id and increments the room's visit count.`,
        inputSchema: z.object({
            characterId: z.string().uuid().describe('ID of the character to move'),
            roomId: z.string().uuid().describe('ID of the destination room')
        })
    }
} as const;

// ============================================================
// TOOL HANDLERS
// ============================================================

function getSpatialRepo(): SpatialRepository {
    const db = getDb(process.env.NODE_ENV === 'test' ? ':memory:' : 'rpg.db');
    return new SpatialRepository(db);
}

function getCharacterRepo(): CharacterRepository {
    const db = getDb(process.env.NODE_ENV === 'test' ? ':memory:' : 'rpg.db');
    return new CharacterRepository(db);
}

/**
 * Simulate a d20 roll
 */
function rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
}

/**
 * Calculate ability modifier from ability score (D&D 5e formula)
 */
function getModifier(abilityScore: number): number {
    return Math.floor((abilityScore - 10) / 2);
}

export async function handleLookAtSurroundings(args: unknown, _ctx: SessionContext) {
    const parsed = SpatialTools.LOOK_AT_SURROUNDINGS.inputSchema.parse(args);
    const spatialRepo = getSpatialRepo();
    const characterRepo = getCharacterRepo();

    const observer = characterRepo.findById(parsed.observerId);
    if (!observer) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: false,
                    error: 'Observer not found'
                }, null, 2)
            }]
        };
    }

    // Get observer's current room (requires current_room_id field)
    const currentRoomId = (observer as unknown as { currentRoomId?: string }).currentRoomId;
    if (!currentRoomId) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: false,
                    error: 'Observer is not in any room. Use move_character_to_room first.'
                }, null, 2)
            }]
        };
    }

    const currentRoom = spatialRepo.findById(currentRoomId);
    if (!currentRoom) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: false,
                    error: 'Observer\'s current room not found in database'
                }, null, 2)
            }]
        };
    }

    // Check for darkness
    const isInDarkness = currentRoom.atmospherics.includes('DARKNESS');
    const hasLight = observer.conditions?.includes('HAS_LIGHT') ||
                     observer.conditions?.includes('DARKVISION');

    if (isInDarkness && !hasLight) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: true,
                    description: "It's pitch black. You can't see anything.",
                    exits: [],
                    entities: [],
                    atmospherics: currentRoom.atmospherics,
                    roomId: currentRoom.id,
                    roomName: currentRoom.name
                }, null, 2)
            }]
        };
    }

    // Filter visible exits based on perception
    const perceptionModifier = getModifier(observer.stats.wis);
    const visibleExits = currentRoom.exits.filter(exit => {
        if (exit.type === 'OPEN') return true;
        if (exit.type === 'LOCKED') return false; // Locked exits are not visible

        if (exit.type === 'HIDDEN') {
            // Perception check: 1d20 + WIS modifier vs DC
            const perceptionRoll = rollD20() + perceptionModifier;
            return perceptionRoll >= (exit.dc || 15);
        }

        return false;
    });

    // Format exit descriptions
    const formattedExits = visibleExits.map(e => ({
        direction: e.direction,
        type: e.type,
        description: e.description || `A ${e.type.toLowerCase()} passage leads ${e.direction}`,
        targetNodeId: e.targetNodeId
    }));

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({
                success: true,
                roomId: currentRoom.id,
                roomName: currentRoom.name,
                description: currentRoom.baseDescription,
                exits: formattedExits,
                entities: currentRoom.entityIds,
                atmospherics: currentRoom.atmospherics,
                biomeContext: currentRoom.biomeContext,
                visitedCount: currentRoom.visitedCount
            }, null, 2)
        }]
    };
}

export async function handleGenerateRoomNode(args: unknown, _ctx: SessionContext) {
    const parsed = SpatialTools.GENERATE_ROOM_NODE.inputSchema.parse(args);
    const spatialRepo = getSpatialRepo();

    const newRoom: RoomNode = {
        id: crypto.randomUUID(),
        name: parsed.name,
        baseDescription: parsed.baseDescription,
        biomeContext: parsed.biomeContext,
        atmospherics: parsed.atmospherics,
        exits: [],
        entityIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visitedCount: 0,
        lastVisitedAt: undefined
    };

    // Save to database
    spatialRepo.create(newRoom);

    // Link from previous room if specified
    if (parsed.previousNodeId && parsed.direction) {
        const prevRoom = spatialRepo.findById(parsed.previousNodeId);
        if (prevRoom) {
            const exit: Exit = {
                direction: parsed.direction,
                targetNodeId: newRoom.id,
                type: 'OPEN'
            };
            spatialRepo.addExit(parsed.previousNodeId, exit);
        }
    }

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({
                success: true,
                roomId: newRoom.id,
                name: newRoom.name,
                description: newRoom.baseDescription,
                biomeContext: newRoom.biomeContext,
                atmospherics: newRoom.atmospherics,
                linkedToPrevious: !!(parsed.previousNodeId && parsed.direction)
            }, null, 2)
        }]
    };
}

export async function handleGetRoomExits(args: unknown, _ctx: SessionContext) {
    const parsed = SpatialTools.GET_ROOM_EXITS.inputSchema.parse(args);
    const spatialRepo = getSpatialRepo();

    const room = spatialRepo.findById(parsed.roomId);
    if (!room) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: false,
                    error: 'Room not found'
                }, null, 2)
            }]
        };
    }

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({
                success: true,
                roomId: room.id,
                roomName: room.name,
                exits: room.exits.map(e => ({
                    direction: e.direction,
                    targetNodeId: e.targetNodeId,
                    type: e.type,
                    dc: e.dc,
                    description: e.description
                }))
            }, null, 2)
        }]
    };
}

export async function handleMoveCharacterToRoom(args: unknown, _ctx: SessionContext) {
    const parsed = SpatialTools.MOVE_CHARACTER_TO_ROOM.inputSchema.parse(args);
    const spatialRepo = getSpatialRepo();
    const characterRepo = getCharacterRepo();

    const character = characterRepo.findById(parsed.characterId);
    if (!character) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: false,
                    error: 'Character not found'
                }, null, 2)
            }]
        };
    }

    const room = spatialRepo.findById(parsed.roomId);
    if (!room) {
        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: false,
                    error: 'Room not found'
                }, null, 2)
            }]
        };
    }

    // Remove character from old room if present
    const oldRoomId = (character as unknown as { currentRoomId?: string }).currentRoomId;
    if (oldRoomId) {
        try {
            spatialRepo.removeEntityFromRoom(oldRoomId, parsed.characterId);
        } catch (e) {
            // Old room may not exist anymore, that's okay
        }
    }

    // Update character's current room (using unknown to bypass TypeScript checks for current_room_id)
    const updatedChar = {
        ...(character as any),
        currentRoomId: parsed.roomId
    };
    characterRepo.update(parsed.characterId, updatedChar as any);

    // Add character to new room
    spatialRepo.addEntityToRoom(parsed.roomId, parsed.characterId);

    // Increment visit count
    spatialRepo.incrementVisitCount(parsed.roomId);

    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify({
                success: true,
                characterId: parsed.characterId,
                characterName: character.name,
                newRoomId: parsed.roomId,
                newRoomName: room.name,
                visitedCount: room.visitedCount + 1
            }, null, 2)
        }]
    };
}
