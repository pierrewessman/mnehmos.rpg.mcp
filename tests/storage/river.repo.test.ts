import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB } from '../../src/db/index';
import { migrate } from '../../src/db/migrations';
import { RiverRepository } from '../../src/db/repos/river.repo.js';
import { WorldRepository } from '../../src/db/repos/world.repo.js';
import { RiverPath } from '../../src/schema/river';
import { FIXED_TIMESTAMP } from '../fixtures';
import { World } from '../../src/schema/world';
import fs from 'fs';

const TEST_DB_PATH = 'test-river-repo.db';

describe('RiverRepository', () => {
    let db: ReturnType<typeof initDB>;
    let repo: RiverRepository;
    let worldRepo: WorldRepository;

    beforeEach(() => {
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = initDB(TEST_DB_PATH);
        migrate(db);
        repo = new RiverRepository(db);
        worldRepo = new WorldRepository(db);

        const world: World = {
            id: 'world-1',
            name: 'Test World',
            seed: 'seed-1',
            width: 100,
            height: 100,
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
        };
        worldRepo.create(world);
    });

    afterEach(() => {
        db.close();
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    it('should create and retrieve a river', () => {
        const river: RiverPath = {
            id: 'river-1',
            worldId: 'world-1',
            name: 'Great River',
            points: [{ x: 0, y: 100 }, { x: 50, y: 50 }, { x: 100, y: 0 }],
            width: 5,
            sourceElevation: 100,
            mouthElevation: 0,
        };

        repo.create(river);

        const retrieved = repo.findByWorldId('world-1');
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0]).toEqual(river);
    });
});
