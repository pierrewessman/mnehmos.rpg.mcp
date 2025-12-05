# QUEST KEEPER AI - 5-HOUR PLAYTEST BUG LOG
## Session Date: December 5, 2024
## Tester: Autonomous Claude Campaign

---

## 🔴 CRITICAL BUGS (Game-Breaking)

### BUG #8: Defeated Enemies Not Removed From Turn Order
**Status**: CRITICAL  
**Discovered**: Combat Encounter #1 (Mine Entrance)  
**Description**: When an enemy reaches 0 HP and is defeated, the combat system does NOT remove them from the turn order. The system still tries to process their turn, showing them as available targets.

**Reproduction Steps**:
1. Create encounter with enemies
2. Reduce enemy HP to 0 via `execute_combat_action`
3. System marks `isDefeated: false` (BUG!)
4. Call `advance_turn()` → system processes dead enemy's turn

**Expected Behavior**: 
- Enemy marked `isDefeated: true` when HP ≤ 0
- `advance_turn()` skips defeated combatants
- UI shows them greyed out or removed

**Actual Behavior**:
- Enemy shows in turn order with HP 8/18
- System allows targeting dead enemies
- Turn queue never cleans up

**Technical Root Cause**: 
`src/combat/combat-manager.ts` - `advance_turn()` doesn't filter `participants.filter(p => !p.isDefeated)`

**Impact**: Combat system is fundamentally broken. All encounters will have "zombie turns" for defeated enemies.

**Suggested Fix**:
```typescript
function advance_turn(encounterId: string) {
  const encounter = getEncounter(encounterId);
  const aliveCombatants = encounter.participants.filter(p => !p.isDefeated);
  
  let nextIndex = (encounter.currentTurnIndex + 1) % aliveCombatants.length;
  // ... rest of logic
}
```

---

### BUG #9: No Environmental/Non-Attack Damage System
**Status**: CRITICAL  
**Discovered**: Beam collapse environmental hazard  
**Description**: The combat system has NO WAY to apply damage except through `execute_combat_action` with attack rolls. There's no tool for:
- Environmental hazards (falling debris, lava, acid)
- Spell effects (fireball, lightning bolt)  
- Ongoing damage (poison, bleeding)
- Forced damage (traps, curses)

**Reproduction Steps**:
1. Create combat encounter
2. Try to apply 3d6 falling damage to multiple targets
3. Realize there's no `apply_damage()` tool

**Expected Behavior**: 
```typescript
apply_damage({
  encounterId: string,
  targetIds: string[],
  damage: number,
  damageType: 'fire' | 'cold' | 'bludgeoning' | etc,
  source: string,
  allowsSave?: boolean,
  saveType?: 'dex' | 'con' | 'wis',
  saveDC?: number
})
```

**Actual Behavior**: 
- Must manually track all non-attack damage
- Beam collapse did 7 damage to zombies → NOT reflected in combat state
- Explosion did 10 damage to Theron → manually subtracted

**Impact**: Makes 80% of D&D mechanics impossible:
- No fireball spells
- No trap damage
- No environmental storytelling (collapsing bridges, lava pits)
- No status effect damage (poison, burning)

**Suggested Fix**: Create `rpg-mcp:apply_damage` tool as HIGH PRIORITY

---

## 🟠 HIGH SEVERITY (Major Gameplay Issues)

### BUG #10: HP Not Syncing Between Character Table and Combat State
**Status**: HIGH  
**Discovered**: Encounter state vs character record mismatch  
**Description**: Elara took damage in combat (24 → 13 HP), but when checking `get_character`, she still shows 24/24 HP. Combat damage doesn't persist to character records.

**Expected**: Damage in combat syncs to character HP after encounter  
**Actual**: Combat HP is ephemeral, character record unchanged  
**Impact**: Players can "heal" by quitting encounters

**Test Case T3.1**: FAILED ❌

---

### WISHLIST #4: Opportunity Attacks Not Implemented
**Status**: HIGH  
**Description**: No system for tracking movement-triggered reactions. When Zombie Alpha moved from its starting position to Elara (30ft away), Theron should have gotten an opportunity attack.

**Needed**:
- Position tracking (X, Y coordinates)
- Movement logging (start position → end position)
- `provoke_opportunity_attack()` when leaving melee range
- Reaction economy (1 per round)

**Impact**: Tactical movement meaningless. No reason to avoid walking past enemies.

---

### WISHLIST #5: Death Saves & Concentration Checks Missing
**Status**: HIGH  
**Description**: 
1. **Death Saves**: When character reaches 0 HP, need automatic death save system (3 successes to stabilize, 3 failures to die)
2. **Concentration**: When spellcaster takes damage while concentrating, needs DC 10 or half damage (whichever higher) CON save

**Impact**: 
- Characters at 0 HP are just "dead" with no dramatic stakes
- Concentration spells (Bless, Haste, etc.) can't be maintained properly

---

### WISHLIST #7: No In-Combat Consumable Use
**Status**: HIGH  
**Description**: Elara drank a healing potion during combat, but had to:
1. Manually roll `2d4+2` 
2. Manually update HP
3. Manually remove item from inventory

No tool exists for `use_item(encounterId, actorId, itemId, targetId)`

**Expected**: One tool call that handles everything  
**Actual**: 3-4 manual steps, error-prone

---

## 🟡 MEDIUM SEVERITY (Immersion/Balance Issues)

### WISHLIST #1: Environmental Damage Tool
**Status**: MEDIUM (but required for #9)  
**Description**: Need dedicated tool for non-attack damage sources  
**Examples**: Falling (1d6 per 10ft), Fire (ongoing 1d6/round), Drowning (RAW rules)

---

### WISHLIST #2: AoE Damage Tool
**Status**: MEDIUM  
**Description**: Fireball, Lightning Bolt, Dragon Breath need splash damage calculations  
**Needed**:
```typescript
apply_aoe_damage({
  encounterId,
  centerPoint: {x, y},
  radius: number, // in feet
  damage: number,
  damageType: string,
  saveType: 'dex' | 'con',
  saveDC: number,
  halfOnSave: boolean
})
```

---

### WISHLIST #3: Condition Application & Tracking
**Status**: MEDIUM  
**Description**: Turn Undead (frightened condition) had to be hand-waved because no way to apply conditions

**Needed**:
- `apply_condition(encounterId, targetId, condition, duration)`
- Automatic duration decrement each round
- Condition effects (disadvantage on attacks, speed halved, etc.)

---

### WISHLIST #6: Critical Fumble Effects
**Status**: LOW  
**Description**: Natural 1 on attack should have consequences:
- Roll on fumble table (drop weapon, fall prone, hit ally)
- Makes combat more dynamic

**Impact**: Nice flavor, but not critical

---

## ✅ WORKING SYSTEMS (What Went Right)

1. **Initiative Rolling**: Correctly randomized with bonuses
2. **Attack Rolls**: d20 + bonus vs AC works perfectly
3. **Damage Application**: When using `execute_combat_action`, damage applies correctly
4. **Turn Advancement**: `advance_turn()` increments properly (just doesn't skip defeated)
5. **Character Creation**: All party members created cleanly
6. **Item Creation & Distribution**: Weapons and potions assigned successfully
7. **Quest System**: Quest created and assigned to character
8. **Party Management**: 4-member party formed with leader designation

---

## 🎯 PRIORITY FIX ORDER

Based on severity and dependency blocking:

### SPRINT 1 (This Week) - Unblock Combat
1. **FIX BUG #8** (Defeated combatants in turn order) - 2 hours
2. **FIX BUG #9** (Add `apply_damage` tool) - 3 hours
3. **FIX BUG #10** (HP sync after combat) - 2 hours

### SPRINT 2 (Next Week) - Consumables & Effects  
4. **WISHLIST #7** (In-combat consumable use) - 4 hours
5. **WISHLIST #3** (Condition system) - 6 hours
6. **WISHLIST #5** (Death saves) - 3 hours

### SPRINT 3 (Week 3) - Tactical Depth
7. **WISHLIST #4** (Opportunity attacks + positioning) - 8 hours
8. **WISHLIST #2** (AoE damage) - 4 hours
9. **WISHLIST #6** (Critical fumbles) - 2 hours

---

## 📊 PLAYABILITY METRICS

**Current Playability Score**: 44% (from audit framework)

**After Sprint 1**: Est. 65% (+21%)  
**After Sprint 2**: Est. 80% (+15%)  
**After Sprint 3**: Est. 95% (+15%)

---

## 🧪 TEST CASES EXECUTED

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| T1.1 | Spell slot recovery | ⏸️ SKIPPED | No spell system tested yet |
| T2.1 | Bonus action economy | ⏸️ SKIPPED | Not tested |
| T3.1 | HP sync after combat | ❌ FAILED | Bug #10 |
| T4.3 | Damage resistance | ⏸️ NOT TESTED | Zombies don't have resistance |
| NEW | Defeated enemies skip turns | ❌ FAILED | Bug #8 |
| NEW | Environmental damage | ❌ FAILED | Bug #9 |

---

## 📝 CAMPAIGN NOTES

### Narrative So Far
- Party: The Ironbound Company (Theron, Lyra, Grimnar, Elara)
- Quest: Investigate collapsed Karak'Thor mines
- NPC: Borin Stonebeard (quest giver, survivor guilt)
- Encounter 1: Mine entrance - 2 Shadow Zombies + 1 Corpse Bloat
- Outcome: Victory, but Elara nearly died (3/24 HP)
- Loot: None yet

### Emergent Gameplay Observations
1. **Environmental tactics work!** Beam collapse was exciting
2. **Glass cannon wizard problem is REAL** - Elara was targeted instantly
3. **Healing economy matters** - Grimnar's potions are precious
4. **Missed attacks create tension** - Theron's Natural 1 was dramatic

### Next Session Goals
1. Continue deeper into mines
2. Test quest objective tracking (`update_objective`)
3. Test loot distribution
4. Test NPC dialogue/memory systems
5. Trigger a more complex encounter (5+ enemies, environmental hazards)

---

## 🔧 RECOMMENDED IMMEDIATE ACTIONS

**For Backend Team (rpg-mcp)**:
```bash
# Critical path
1. git checkout -b fix/combat-defeated-enemies
2. Modify combat-manager.ts → skipDefeatedCombatants()
3. Add apply_damage tool to tool registry
4. Add hp_sync_on_encounter_end to combat resolution
5. Write tests for all three fixes
6. Merge to main
```

**For Frontend Team (Quest Keeper AI)**:
```bash
# Wait for backend fixes, then:
1. Update combat UI to grey out defeated enemies
2. Add HP bars that sync with character records
3. Add environmental damage input UI (DM tools)
4. Add consumable quick-use buttons in combat
```

---

## 🎮 NEXT PLAYTEST SESSION

**Objective**: Test fixes to Bugs #8, #9, #10  
**Scenario**: Second mine encounter with:
- Environmental hazards (pit trap, collapsing ceiling)
- Consumable use (healing potions in combat)
- Multiple enemy defeats (test turn order cleanup)
- Long encounter (test HP persistence after 10+ rounds)

**Expected Duration**: 2 hours  
**Success Criteria**: All 3 critical bugs resolved

---

**END OF BUG LOG - SESSION 1**