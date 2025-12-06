import Database from 'better-sqlite3';
import { RoomNode, RoomNodeSchema, Exit } from '../../schema/spatial.js';

export class SpatialRepository {
    constructor(private db: Database.Database) { }

    create(room: RoomNode): void {
        const validRoom = RoomNodeSchema.parse(room);

        const stmt = this.db.prepare(`
            INSERT INTO room_nodes (
                id, name, base_description, biome_context, atmospherics,
                exits, entity_ids, created_at, updated_at, visited_count, last_visited_at
            )
            VALUES (
                @id, @name, @baseDescription, @biomeContext, @atmospherics,
                @exits, @entityIds, @createdAt, @updatedAt, @visitedCount, @lastVisitedAt
            )
        `);

        stmt.run({
            id: validRoom.id,
            name: validRoom.name,
            baseDescription: validRoom.baseDescription,
            biomeContext: validRoom.biomeContext,
            atmospherics: JSON.stringify(validRoom.atmospherics),
            exits: JSON.stringify(validRoom.exits),
            entityIds: JSON.stringify(validRoom.entityIds),
            createdAt: validRoom.createdAt,
            updatedAt: validRoom.updatedAt,
            visitedCount: validRoom.visitedCount,
            lastVisitedAt: validRoom.lastVisitedAt || null,
        });
    }

    findById(id: string): RoomNode | null {
        const stmt = this.db.prepare('SELECT * FROM room_nodes WHERE id = ?');
        const row = stmt.get(id) as RoomNodeRow | undefined;

        if (!row) return null;
        return this.rowToRoomNode(row);
    }

    findAll(): RoomNode[] {
        const stmt = this.db.prepare('SELECT * FROM room_nodes ORDER BY name');
        const rows = stmt.all() as RoomNodeRow[];
        return rows.map(row => this.rowToRoomNode(row));
    }

    findByBiome(biome: string): RoomNode[] {
        const stmt = this.db.prepare('SELECT * FROM room_nodes WHERE biome_context = ? ORDER BY name');
        const rows = stmt.all(biome) as RoomNodeRow[];
        return rows.map(row => this.rowToRoomNode(row));
    }

    update(id: string, updates: Partial<RoomNode>): RoomNode | null {
        const existing = this.findById(id);
        if (!existing) return null;

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Validate full object
        const validRoom = RoomNodeSchema.parse(updated);

        const stmt = this.db.prepare(`
            UPDATE room_nodes
            SET name = ?, base_description = ?, biome_context = ?,
                atmospherics = ?, exits = ?, entity_ids = ?,
                visited_count = ?, last_visited_at = ?, updated_at = ?
            WHERE id = ?
        `);

        stmt.run(
            validRoom.name,
            validRoom.baseDescription,
            validRoom.biomeContext,
            JSON.stringify(validRoom.atmospherics),
            JSON.stringify(validRoom.exits),
            JSON.stringify(validRoom.entityIds),
            validRoom.visitedCount,
            validRoom.lastVisitedAt || null,
            validRoom.updatedAt,
            id
        );

        return validRoom;
    }

    delete(id: string): boolean {
        const stmt = this.db.prepare('DELETE FROM room_nodes WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // Helper methods for entity management
    addEntityToRoom(roomId: string, entityId: string): void {
        const room = this.findById(roomId);
        if (!room) throw new Error(`Room ${roomId} not found`);

        if (!room.entityIds.includes(entityId)) {
            room.entityIds.push(entityId);
            this.update(roomId, { entityIds: room.entityIds });
        }
    }

    removeEntityFromRoom(roomId: string, entityId: string): void {
        const room = this.findById(roomId);
        if (!room) throw new Error(`Room ${roomId} not found`);

        room.entityIds = room.entityIds.filter(id => id !== entityId);
        this.update(roomId, { entityIds: room.entityIds });
    }

    getEntitiesInRoom(roomId: string): string[] {
        const room = this.findById(roomId);
        if (!room) return [];
        return room.entityIds;
    }

    // Helper methods for exit management
    addExit(roomId: string, exit: Exit): void {
        const room = this.findById(roomId);
        if (!room) throw new Error(`Room ${roomId} not found`);

        room.exits.push(exit);
        this.update(roomId, { exits: room.exits });
    }

    findConnectedRooms(roomId: string): RoomNode[] {
        const room = this.findById(roomId);
        if (!room) return [];

        const connectedRooms: RoomNode[] = [];
        for (const exit of room.exits) {
            const targetRoom = this.findById(exit.targetNodeId);
            if (targetRoom) {
                connectedRooms.push(targetRoom);
            }
        }

        return connectedRooms;
    }

    incrementVisitCount(roomId: string): void {
        const room = this.findById(roomId);
        if (!room) throw new Error(`Room ${roomId} not found`);

        this.update(roomId, {
            visitedCount: room.visitedCount + 1,
            lastVisitedAt: new Date().toISOString()
        });
    }

    private rowToRoomNode(row: RoomNodeRow): RoomNode {
        return RoomNodeSchema.parse({
            id: row.id,
            name: row.name,
            baseDescription: row.base_description,
            biomeContext: row.biome_context,
            atmospherics: JSON.parse(row.atmospherics),
            exits: JSON.parse(row.exits),
            entityIds: JSON.parse(row.entity_ids),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            visitedCount: row.visited_count,
            lastVisitedAt: row.last_visited_at || undefined,
        });
    }
}

interface RoomNodeRow {
    id: string;
    name: string;
    base_description: string;
    biome_context: string;
    atmospherics: string;
    exits: string;
    entity_ids: string;
    created_at: string;
    updated_at: string;
    visited_count: number;
    last_visited_at: string | null;
}
