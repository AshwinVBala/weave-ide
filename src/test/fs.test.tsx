import { describe, it, expect, beforeEach } from 'vitest';
import { fsService, inMemoryFs } from '../services/fsService';

describe('IPC File System Service Tests', () => {
  beforeEach(() => {
    inMemoryFs.reset();
  });

  it('lists directory contents with directories first', async () => {
    const items = await fsService.listDir('/workspace');
    expect(items.length).toBeGreaterThan(0);

    // Verify /workspace/src directory is included
    const srcDir = items.find((i) => i.name === 'src');
    expect(srcDir).toBeDefined();
    expect(srcDir?.isDir).toBe(true);

    // Verify .toml and .md files
    const weaveToml = items.find((i) => i.name === 'weave.toml');
    expect(weaveToml).toBeDefined();
    expect(weaveToml?.isDir).toBe(false);
  });

  it('reads file content correctly', async () => {
    const content = await fsService.readFile('/workspace/src/main.wv');
    expect(content).toContain('strand TaskWorker');
    expect(content).toContain('loom AppLoom');
  });

  it('writes and updates file content', async () => {
    const newContent = 'fn updated() { io::println("updated!"); }';
    await fsService.writeFile('/workspace/src/updated.wv', newContent);

    const readBack = await fsService.readFile('/workspace/src/updated.wv');
    expect(readBack).toBe(newContent);
  });

  it('creates new files and directories', async () => {
    await fsService.createDir('/workspace/tests');
    await fsService.createFile('/workspace/tests/test_loom.wv');

    const testFiles = await fsService.listDir('/workspace/tests');
    expect(testFiles.some((f) => f.name === 'test_loom.wv')).toBe(true);
  });

  it('deletes entries properly', async () => {
    await fsService.createFile('/workspace/src/temp.wv');
    let items = await fsService.listDir('/workspace/src');
    expect(items.some((f) => f.name === 'temp.wv')).toBe(true);

    await fsService.deleteEntry('/workspace/src/temp.wv');
    items = await fsService.listDir('/workspace/src');
    expect(items.some((f) => f.name === 'temp.wv')).toBe(false);
  });

  it('renames files without losing their contents', async () => {
    const original = await fsService.readFile('/workspace/src/main.wv');

    await fsService.renameEntry('/workspace/src/main.wv', '/workspace/src/app.wv');

    await expect(fsService.readFile('/workspace/src/app.wv')).resolves.toBe(original);
    await expect(fsService.readFile('/workspace/src/main.wv')).rejects.toThrow('File not found');
  });

  it('renames folders recursively and refuses to overwrite an existing path', async () => {
    await fsService.createDir('/workspace/features');
    await fsService.writeFile('/workspace/features/nested.wv', 'fn nested() {}');

    await fsService.renameEntry('/workspace/features', '/workspace/modules');

    await expect(fsService.readFile('/workspace/modules/nested.wv')).resolves.toBe('fn nested() {}');
    await expect(fsService.readFile('/workspace/features/nested.wv')).rejects.toThrow('File not found');
    await expect(
      fsService.renameEntry('/workspace/modules', '/workspace/src')
    ).rejects.toThrow('Path already exists');
  });

  it('builds recursive workspace tree structure', async () => {
    const tree = await fsService.buildTree('/workspace');
    expect(tree.isDir).toBe(true);
    expect(tree.children).toBeDefined();

    const srcNode = tree.children?.find((c) => c.name === 'src');
    expect(srcNode).toBeDefined();
    expect(srcNode?.isDir).toBe(true);
    expect(srcNode?.children?.some((c) => c.name === 'main.wv')).toBe(true);
  });

  it('does not fake a native folder selection in the browser fallback', async () => {
    await expect(fsService.selectWorkspaceFolder()).resolves.toBeNull();
  });
});
