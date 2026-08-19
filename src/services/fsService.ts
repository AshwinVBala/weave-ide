import { FileItem } from '../types';
import { INITIAL_MOCK_FILES } from './mockWorkspace';

export interface FsService {
  isTauri: boolean;
  listDir: (dirPath: string) => Promise<FileItem[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string) => Promise<void>;
  createDir: (dirPath: string) => Promise<void>;
  deleteEntry: (targetPath: string) => Promise<void>;
  renameEntry: (sourcePath: string, targetPath: string) => Promise<void>;
  buildTree: (rootPath: string) => Promise<FileItem>;
  selectWorkspaceFolder: () => Promise<string | null>;
}

// In-memory virtual file system storage for web preview / testing
class InMemoryFileSystem {
  private files: Map<string, string> = new Map();
  private dirs: Set<string> = new Set(['/workspace', '/workspace/src']);

  constructor() {
    this.reset();
  }

  reset() {
    this.files.clear();
    this.dirs.clear();
    this.dirs.add('/workspace');
    this.dirs.add('/workspace/src');

    for (const [filePath, content] of Object.entries(INITIAL_MOCK_FILES)) {
      this.files.set(filePath, content);
      // Ensure parent dirs
      const parts = filePath.split('/').slice(0, -1);
      let cur = '';
      for (const p of parts) {
        if (!p) continue;
        cur += '/' + p;
        this.dirs.add(cur);
      }
    }
  }

  async listDir(dirPath: string): Promise<FileItem[]> {
    const normalized = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
    const results: FileItem[] = [];
    const directChildDirs = new Set<string>();

    for (const d of this.dirs) {
      if (d !== normalized && d.startsWith(normalized + '/')) {
        const sub = d.slice(normalized.length + 1);
        const firstSegment = sub.split('/')[0];
        if (firstSegment) {
          directChildDirs.add(`${normalized}/${firstSegment}`);
        }
      }
    }

    for (const childDir of directChildDirs) {
      const name = childDir.split('/').pop() || '';
      results.push({
        name,
        path: childDir,
        isDir: true,
      });
    }

    for (const [filePath, content] of this.files.entries()) {
      if (filePath.startsWith(normalized + '/')) {
        const sub = filePath.slice(normalized.length + 1);
        if (!sub.includes('/')) {
          const name = sub;
          const ext = name.includes('.') ? name.split('.').pop() : undefined;
          results.push({
            name,
            path: filePath,
            isDir: false,
            size: content.length,
            extension: ext,
            modifiedAt: Date.now(),
          });
        }
      }
    }

    // Sort dirs first, then files
    results.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.files.has(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return this.files.get(filePath)!;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
    // Add parent directories
    const parts = filePath.split('/').slice(0, -1);
    let cur = '';
    for (const p of parts) {
      if (!p) continue;
      cur += '/' + p;
      this.dirs.add(cur);
    }
  }

  async createFile(filePath: string): Promise<void> {
    if (this.files.has(filePath)) {
      throw new Error(`File already exists: ${filePath}`);
    }
    await this.writeFile(filePath, '');
  }

  async createDir(dirPath: string): Promise<void> {
    const normalized = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
    this.dirs.add(normalized);
  }

  async deleteEntry(targetPath: string): Promise<void> {
    const normalized = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath;
    this.files.delete(normalized);
    // Delete if it's a directory
    this.dirs.delete(normalized);
    // Delete any children
    for (const f of Array.from(this.files.keys())) {
      if (f.startsWith(normalized + '/')) {
        this.files.delete(f);
      }
    }
    for (const d of Array.from(this.dirs.keys())) {
      if (d.startsWith(normalized + '/')) {
        this.dirs.delete(d);
      }
    }
  }

  async renameEntry(sourcePath: string, targetPath: string): Promise<void> {
    const source = sourcePath.endsWith('/') ? sourcePath.slice(0, -1) : sourcePath;
    const target = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath;
    if (!this.files.has(source) && !this.dirs.has(source)) {
      throw new Error(`Path does not exist: ${sourcePath}`);
    }
    if (this.files.has(target) || this.dirs.has(target)) {
      throw new Error(`Path already exists: ${targetPath}`);
    }

    if (this.files.has(source)) {
      const content = this.files.get(source)!;
      this.files.delete(source);
      this.files.set(target, content);
      return;
    }

    const renamedDirs = Array.from(this.dirs)
      .filter((path) => path === source || path.startsWith(`${source}/`))
      .map((path) => [path, `${target}${path.slice(source.length)}`] as const);
    const renamedFiles = Array.from(this.files.entries())
      .filter(([path]) => path.startsWith(`${source}/`))
      .map(([path, content]) => [path, `${target}${path.slice(source.length)}`, content] as const);

    renamedDirs.forEach(([oldPath]) => this.dirs.delete(oldPath));
    renamedFiles.forEach(([oldPath]) => this.files.delete(oldPath));
    renamedDirs.forEach(([, newPath]) => this.dirs.add(newPath));
    renamedFiles.forEach(([, newPath, content]) => this.files.set(newPath, content));
  }
}

export const inMemoryFs = new InMemoryFileSystem();

// Tauri IPC Invoker Check
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
}

// Native calls must preserve real filesystem errors. The virtual FS is used only in browsers.
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriEnvironment()) throw new Error('Tauri IPC is not available');
  const core = await import('@tauri-apps/api/core');
  return core.invoke<T>(cmd, args);
}

export const fsService: FsService = {
  get isTauri() {
    return isTauriEnvironment();
  },

  async listDir(dirPath: string): Promise<FileItem[]> {
    if (isTauriEnvironment()) {
      const rawList = await tauriInvoke<
        Array<{
          name: string;
          path: string;
          is_dir: boolean;
          size?: number;
          modified_at?: number;
          extension?: string;
        }>
      >('list_dir', { path: dirPath });

      return rawList.map((item) => ({
        name: item.name,
        path: item.path,
        isDir: item.is_dir,
        size: item.size,
        modifiedAt: item.modified_at,
        extension: item.extension,
      }));
    }
    return inMemoryFs.listDir(dirPath);
  },

  async selectWorkspaceFolder(): Promise<string | null> {
    if (!isTauriEnvironment()) return null;
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Open Folder in Weave IDE',
    });
    return typeof selected === 'string' ? selected : null;
  },

  async readFile(filePath: string): Promise<string> {
    if (isTauriEnvironment()) {
      return tauriInvoke<string>('read_file', { path: filePath });
    }
    return inMemoryFs.readFile(filePath);
  },

  async writeFile(filePath: string, content: string): Promise<void> {
    if (isTauriEnvironment()) {
      return tauriInvoke<void>('write_file', { path: filePath, content });
    }
    return inMemoryFs.writeFile(filePath, content);
  },

  async createFile(filePath: string): Promise<void> {
    if (isTauriEnvironment()) {
      return tauriInvoke<void>('create_file', { path: filePath });
    }
    return inMemoryFs.createFile(filePath);
  },

  async createDir(dirPath: string): Promise<void> {
    if (isTauriEnvironment()) {
      return tauriInvoke<void>('create_dir', { path: dirPath });
    }
    return inMemoryFs.createDir(dirPath);
  },

  async deleteEntry(targetPath: string): Promise<void> {
    if (isTauriEnvironment()) {
      return tauriInvoke<void>('delete_entry', { path: targetPath });
    }
    return inMemoryFs.deleteEntry(targetPath);
  },

  async renameEntry(sourcePath: string, targetPath: string): Promise<void> {
    if (isTauriEnvironment()) {
      return tauriInvoke<void>('rename_entry', {
        sourcePath,
        targetPath,
      });
    }
    return inMemoryFs.renameEntry(sourcePath, targetPath);
  },

  async buildTree(rootPath: string): Promise<FileItem> {
    const rootName = rootPath.split('/').pop() || 'workspace';
    const rootNode: FileItem = {
      name: rootName,
      path: rootPath,
      isDir: true,
      isOpen: true,
      children: [],
    };

    const loadChildren = async (item: FileItem) => {
      const children = await fsService.listDir(item.path);
      for (const child of children) {
        if (child.isDir) {
          await loadChildren(child);
        }
      }
      item.children = children;
    };

    await loadChildren(rootNode);
    return rootNode;
  },
};
