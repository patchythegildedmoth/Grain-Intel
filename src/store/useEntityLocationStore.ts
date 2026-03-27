import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EntityLocation, ElevatorLocation } from '../types/entityLocation';

interface EntityLocationState {
  entityLocations: Record<string, EntityLocation>;
  elevatorLocation: ElevatorLocation | null;

  setEntityLocation: (loc: EntityLocation) => void;
  setEntityLocations: (locs: EntityLocation[]) => void;
  removeEntityLocation: (entity: string) => void;
  setElevatorLocation: (loc: ElevatorLocation) => void;
  clearLocations: () => void;
}

/** Normalize entity name for consistent lookup */
function normalize(name: string): string {
  return name.trim().toUpperCase();
}

export const useEntityLocationStore = create<EntityLocationState>()(
  persist(
    (set) => ({
      entityLocations: {},
      elevatorLocation: null,

      setEntityLocation: (loc) =>
        set((s) => ({
          entityLocations: {
            ...s.entityLocations,
            [normalize(loc.entity)]: { ...loc, entity: normalize(loc.entity) },
          },
        })),

      setEntityLocations: (locs) =>
        set((s) => {
          const updated = { ...s.entityLocations };
          for (const loc of locs) {
            const key = normalize(loc.entity);
            updated[key] = { ...loc, entity: key };
          }
          return { entityLocations: updated };
        }),

      removeEntityLocation: (entity) =>
        set((s) => {
          const updated = { ...s.entityLocations };
          delete updated[normalize(entity)];
          return { entityLocations: updated };
        }),

      setElevatorLocation: (loc) => set({ elevatorLocation: loc }),

      clearLocations: () => set({ entityLocations: {}, elevatorLocation: null }),
    }),
    {
      name: 'grain-intel-entity-locations',
      version: 1,
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[EntityLocationStore] Failed to rehydrate, clearing corrupted state:', error);
          localStorage.removeItem('grain-intel-entity-locations');
        }
      },
    },
  ),
);
