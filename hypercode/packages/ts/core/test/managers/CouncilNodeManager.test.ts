import { describe, test, expect, beforeEach, mock } from 'vitest';
import { CouncilNodeManager } from '../../src/managers/CouncilNodeManager.ts';

describe('CouncilNodeManager', () => {
  let manager: CouncilNodeManager;

  beforeEach(() => {
    CouncilNodeManager['instance'] = null; // Reset singleton
    manager = CouncilNodeManager.getInstance();
  });

  test('should add and retrieve nodes', () => {
    const node = manager.addNode({
      name: 'Test Node',
      url: 'http://localhost:3001',
    });

    expect(node.id).toBeDefined();
    expect(node.name).toBe('Test Node');
    expect(manager.getAllNodes().length).toBe(1);
  });

  test('should update node status', () => {
    const node = manager.addNode({ name: 'Node 1', url: 'http://loc:3001' });
    manager.updateNode(node.id, { status: 'online' });
    
    const updated = manager.getNode(node.id);
    expect(updated?.status).toBe('online');
  });

  test('should remove nodes', () => {
    const node = manager.addNode({ name: 'To Remove', url: 'http://loc:3001' });
    manager.removeNode(node.id);
    expect(manager.getNode(node.id)).toBeNull();
  });
});
