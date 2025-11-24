import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB } from '../../src/db/index';
import { migrate } from '../../src/db/migrations';
import { RegionRepository } from '../../src/db/repos/region.repo.js';
import { WorldRepository } from '../../src/db/repos/world.repo.js';
import { Region } from '../../src/schema/region';
import { FIXED_TIMESTAMP } from '../fixtures';
import { World } from '../../src/schema/world';
import fs from 'fs';

const TEST_DB_PATH = 'test-region-repo.db';

describe('RegionRepository', () => {
    let db: ReturnType<typeof initDB>;
    let repo: RegionRepository;
    let worldRepo: WorldRepository;

    beforeEach(() => {
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = initDB(TEST_DB_PATH);
        migrate(db);
        repo = new RegionRepository(db);
        worldRepo = new WorldRepository(db);

        // Create a world for foreign key constraint
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

    it('should create and retrieve a region', () => {
        const region: Region = {
            id: 'region-1',
            worldId: 'world-1',
            name: 'Kingdom of Test',
            type: 'kingdom',
            centerX: 50,
            centerY: 50,
            color: '#ff0000',
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
        };

        repo.create(region);

        const retrieved = repo.findById('region-1');
        expect(retrieved).toEqual(region);
    });

    it('should find regions by worldId', () => {
        const r1: Region = {
            id: 'r1',
            worldId: 'world-1',
            name: 'R1',
            type: 'kingdom',
            centerX: 10,
            centerY: 10,
            color: '#000',
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
        };
        const r2: Region = {
            id: 'r2',
            worldId: 'world-1',
            name: 'R2',
            type: 'wilderness',
            centerX: 20,
            centerY: 20,
            color: '#fff',
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
        };

        repo.create(r1);
        repo.create(r2);

        const regions = repo.findByWorldId('world-1');
        expect(regions).toHaveLength(2);
        expect(regions).toContainEqual(r1);
        expect(regions).toContainEqual(r2);
    });
});
