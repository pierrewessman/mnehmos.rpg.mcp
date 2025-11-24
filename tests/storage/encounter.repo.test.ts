import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB } from '../../src/db/index';
import { migrate } from '../../src/db/migrations';
import { EncounterRepository } from '../../src/db/repos/encounter.repo.js';
import { RegionRepository } from '../../src/db/repos/region.repo.js';
import { WorldRepository } from '../../src/db/repos/world.repo.js';
import { Encounter } from '../../src/schema/encounter';
import { Region } from '../../src/schema/region';
import { World } from '../../src/schema/world';
import { FIXED_TIMESTAMP } from '../fixtures';
import fs from 'fs';

const TEST_DB_PATH = 'test-encounter-repo.db';

describe('EncounterRepository', () => {
    let db: ReturnType<typeof initDB>;
    let repo: EncounterRepository;
    let regionRepo: RegionRepository;
    let worldRepo: WorldRepository;

    beforeEach(() => {
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = initDB(TEST_DB_PATH);
        migrate(db);
        repo = new EncounterRepository(db);
        regionRepo = new RegionRepository(db);
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

        const region: Region = {
            id: 'region-1',
            worldId: 'world-1',
            name: 'Test Region',
            type: 'wilderness',
            centerX: 0,
            centerY: 0,
            color: '#000',
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
        };
        regionRepo.create(region);
    });

    afterEach(() => {
        db.close();
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    it('should create and retrieve an encounter', () => {
        const encounter: Encounter = {
            id: 'enc-1',
            regionId: 'region-1',
            tokens: [
                { id: 't1', characterId: 'c1', x: 0, y: 0, hp: 10, conditions: [] },
            ],
            round: 1,
            activeTokenId: 't1',
            status: 'active',
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
        };

        repo.create(encounter);

        const retrieved = repo.findByRegionId('region-1');
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0]).toEqual(encounter);
    });
});
