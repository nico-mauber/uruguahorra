/**
 * Tests básicos para useSquadsStore
 * Verifica el estado inicial y operaciones básicas
 */

import { useSquadsStore } from '../useSquadsStore';
import { act, renderHook } from '@testing-library/react';

// Mock del SquadsService
jest.mock('@/services/squads.service', () => ({
  SquadsService: {
    getUserSquads: jest.fn(),
    createSquad: jest.fn(),
    joinSquad: jest.fn(),
    leaveSquad: jest.fn(),
    getSquadMembers: jest.fn(),
    updateMemberSavings: jest.fn(),
    searchSquads: jest.fn(),
  },
}));

// Mock del logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    start: jest.fn(),
  },
  LogModule: {
    CACHE: 'cache',
    STORE: 'store',
    DB: 'db',
  },
}));

describe('useSquadsStore', () => {
  beforeEach(() => {
    // Reset store antes de cada test
    const { result } = renderHook(() => useSquadsStore());
    act(() => {
      result.current.clearStore();
    });
  });

  describe('Estado inicial', () => {
    test('debe tener el estado inicial correcto', () => {
      const { result } = renderHook(() => useSquadsStore());

      expect(result.current.userSquads).toEqual([]);
      expect(result.current.currentSquad).toBeNull();
      expect(result.current.squadMembers).toEqual({});
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isJoining).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetchUserId).toBeNull();
    });
  });

  describe('Utilidades', () => {
    test('getUserSquadById debe retornar null para squad inexistente', () => {
      const { result } = renderHook(() => useSquadsStore());

      const squad = result.current.getUserSquadById('non-existent-id');
      expect(squad).toBeNull();
    });

    test('isUserInSquad debe retornar false para squad inexistente', () => {
      const { result } = renderHook(() => useSquadsStore());

      const isInSquad = result.current.isUserInSquad('non-existent-id');
      expect(isInSquad).toBe(false);
    });

    test('getUserRoleInSquad debe retornar null para squad inexistente', () => {
      const { result } = renderHook(() => useSquadsStore());

      const role = result.current.getUserRoleInSquad('non-existent-id');
      expect(role).toBeNull();
    });
  });

  describe('setCurrentSquad', () => {
    test('debe actualizar el squad actual', () => {
      const { result } = renderHook(() => useSquadsStore());
      const mockSquad = {
        id: 'squad-1',
        name: 'Test Squad',
        description: 'Test Description',
        ownerId: 'owner-1',
        inviteCode: 'TEST123',
        maxMembers: 10,
        isActive: true,
        createdAt: '2025-08-24T00:00:00Z',
        updatedAt: '2025-08-24T00:00:00Z',
        memberRole: 'member' as const,
        memberCount: 5,
      };

      act(() => {
        result.current.setCurrentSquad(mockSquad);
      });

      expect(result.current.currentSquad).toEqual(mockSquad);
    });
  });

  describe('clearSearchResults', () => {
    test('debe limpiar los resultados de búsqueda', () => {
      const { result } = renderHook(() => useSquadsStore());

      // Simular que hay resultados
      act(() => {
        result.current.clearSearchResults();
      });

      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('clearStore', () => {
    test('debe resetear todo el estado', () => {
      const { result } = renderHook(() => useSquadsStore());

      act(() => {
        result.current.clearStore();
      });

      expect(result.current.userSquads).toEqual([]);
      expect(result.current.currentSquad).toBeNull();
      expect(result.current.squadMembers).toEqual({});
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isJoining).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetchUserId).toBeNull();
    });
  });
});
