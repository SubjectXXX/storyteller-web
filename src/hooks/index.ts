export {
  scenarioKeys,
  useScenario,
  useScenarios,
  usePlayTurn,
  useSubmitChoice,
} from './useScenarios';
export { walletKeys, useWallet, useTopUpWallet } from './useWallet';
export { referralKeys, useReferral, useShareReferral } from './useReferrals';
export { settingsKeys, useSettings, useUpdateSettings } from './useSettings';
export {
  adventureKeys,
  useAdventure,
  useAdventureStream,
  useAdventures,
  useCreateBranch,
  useStartAdventure,
  useSubmitTurn,
  type AdventureStreamHandlers,
  type AdventureStreamState,
  type UseAdventureStreamOptions,
} from './useAdventures';
export { useAiStatus } from './useAiStatus';
export { useAuth } from './useAuth';

// Stage 4 — World panels (S4-T01)
export { characterKeys, useCharacter } from './useCharacter';
export { npcKeys, useNpcRoster } from './useNpcRoster';
export {
  extractInventory,
  isInventoryItem,
  summariseInventory,
  useInventory,
  type InventoryItem,
  type InventorySlot,
  type InventoryTotals,
} from './useInventory';
export { recapKeys, useRecap } from './useRecap';
export {
  extractMechanicEvent,
  useDiceClock,
  type ClockTick,
  type DiceRoll,
  type MechanicEvent,
  type MechanicKind,
} from './useDiceClock';

// Stage 4 — Branch tree + ops (S4-T03)
export { branchTreeKeys, useBranchTree, useBranchTreeAccessors } from './useBranchTree';
export { useRedoBranch, useRetryBranch, useUndoBranch } from './useBranchOps';

// Stage 4 — Settings (S4-T05 + S4-T06)
export {
  adventureSettingsKeys,
  effectiveSettingsKeys,
  useAdventureSettings,
  useEffectiveSettings,
  useUpdateAdventureSettings,
} from './useAdventureSettings';
export { playerSettingsKeys, usePlayerSettings, useUpdatePlayerSettings } from './usePlayerSettings';
