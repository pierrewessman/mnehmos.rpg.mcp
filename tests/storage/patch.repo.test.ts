import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB } from '../../src/db/index';
import { migrate } from '../../src/db/migrations';
import { PatchRepository } from '../../src/db/repos/patch.repo.js';
import { MapPatch } from '../../src/schema/patch';
import { FIXED_TIMESTAMP } from '../fixtures';
import fs from 'fs';

const TEST_DB_PATH = 'test-patch-repo.db';

describe('PatchRepository', () => {
    let db: ReturnType<typeof initDB>;
    let repo: PatchRepository;

    beforeEach(() => {
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = initDB(TEST_DB_PATH);
        migrate(db);
        repo = new PatchRepository(db);
    });

    afterEach(() => {
        db.close();
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    it('should log and retrieve patches', () => {
        const patch1: MapPatch = {
            op: 'add',
            path: '/structures/1',
            value: { id: 's1' },
            timestamp: FIXED_TIMESTAMP,
        };
        const patch2: MapPatch = {
            op: 'remove',
            path: '/structures/2',
            timestamp: FIXED_TIMESTAMP,
        };

        repo.log(patch1);
        repo.log(patch2);

        const history = repo.getHistory();
        expect(history).toHaveLength(2);
        expect(history[0]).toEqual(patch1);
        expect(history[1]).toEqual(patch2);
    });
});
