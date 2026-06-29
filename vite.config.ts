import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const ROOT = dirname(fileURLToPath(import.meta.url));

const generatedPipelineArtifactPatterns = [
  /\.articulated\.json$/i,
  /(?:^|-)source(?:-|\.|$)/i,
  /-chroma\.(?:png|jpe?g|webp)$/i,
  /-whole-painted(?:-[^.]+)?\.(?:png|jpe?g|webp)$/i,
  /-uncropped\.(?:png|jpe?g|webp)$/i,
];

function isPlayerGeneratedAsset(relativePath: string) {
  const name = basename(relativePath);
  return !generatedPipelineArtifactPatterns.some((pattern) => pattern.test(name));
}

async function copyFilteredTree(
  sourceDir: string,
  outDir: string,
  includeFile: (relativePath: string) => boolean = () => true,
  prefix = '',
) {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const targetPath = join(outDir, relativePath);

    if (entry.isDirectory()) {
      await copyFilteredTree(sourcePath, outDir, includeFile, relativePath);
      continue;
    }
    if (!entry.isFile() || !includeFile(relativePath)) continue;

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
}

function playerPublicAssets(): Plugin {
  return {
    name: 'water9-player-public-assets',
    apply: 'build',
    async writeBundle(options) {
      const outDir = resolve(ROOT, String(options.dir ?? 'dist'));
      const publicDir = resolve(ROOT, 'public');

      await copyFilteredTree(
        resolve(publicDir, 'assets/audio'),
        resolve(outDir, 'assets/audio'),
      );
      await copyFilteredTree(
        resolve(publicDir, 'assets/generated'),
        resolve(outDir, 'assets/generated'),
        isPlayerGeneratedAsset,
      );
    },
  };
}

export default defineConfig({
  publicDir: false,
  plugins: [playerPublicAssets()],
});
