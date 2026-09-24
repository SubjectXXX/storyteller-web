export {
  scenarioKeys,
  useScenario,
  useScenarios,
  usePlayTurn,
  useSubmitChoice,
} from './useScenarios';
export { walletKeys, useWallet, useTopUpWallet } from './useWallet';
export { creditPackageKeys, useCreditPackages } from './useCreditPackages';
export { useTestAi } from './useAiTest';
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

// Stage 4 — Player defaults + per-adventure settings (S4-T05 / S4-T06)
export {
  playerSettingsKeys,
  usePlayerSettings,
  usePlayerSettingsEtag,
  useUpdatePlayerSettings,
} from './usePlayerSettings';
export {
  adventureSettingsKeys,
  effectiveSettingsKeys,
  useAdventureSettings,
  useAdventureSettingsEtag,
  useEffectiveSettings,
  useUpdateAdventureSettings,
} from './useAdventureSettings';

// Stage 4 — Dice/clock + inventory derivation helpers (S4-T01..S4-T03)
export {
  useDiceClock,
  type ClockTick,
  type DiceRoll,
  type MechanicEvent,
  type MechanicKind,
} from './useDiceClock';
export {
  useInventory,
  type InventoryItem,
  type InventorySlot,
  type InventoryTotals,
} from './useInventory';

// Stage 5 — Memory & context (S5-T01..S5-T02)
export {
  memoryKeys,
  useMemoryLore,
  useMemoryPinned,
  useMemoryRecap,
  type UseMemoryLoreResult,
} from './useMemory';

// Stage 6 — Visual generation (S6-T01..S6-T02)
export {
  imageKeys,
  useImageCarousel,
  useImageJob,
  type UseImageJobResult,
} from './useImageGen';