import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingRoot = path.join(root, '.kimm-build');
const outputRoot = path.join(root, 'dist');
const useLocalDependencies = process.argv.includes('--local');
const apps = [
  { source: 'KIMM-CAD', slug: 'cad', refs: true },
  { source: 'KIMM-CAM', slug: 'cam', refs: true },
  { source: 'KIMM-FLOW', slug: 'flow' },
  { source: 'KIMM-STRUCTURE', slug: 'structure', refs: true },
  { source: 'KIMM-SYS', slug: 'sys' },
];
const omitted = new Set(['node_modules', 'dist', '.npm-cache', '.pnpm-store', '.git', 'polyMesh', 'tutorial']);

function insideRoot(target) {
  const relative = path.relative(root, path.resolve(target));
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Unsafe build path: ${target}`);
  }
  return target;
}

function runNpm(args, cwd) {
  const windows = process.platform === 'win32';
  const command = windows ? 'cmd.exe' : 'npm';
  const commandArgs = windows ? ['/d', '/s', '/c', `npm ${args.join(' ')}`] : args;
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${cwd}`);
}

async function replaceRequired(file, original, replacement) {
  const before = await readFile(file, 'utf8');
  if (!before.includes(original)) throw new Error(`Expected path not found: ${file}: ${original}`);
  await writeFile(file, before.replaceAll(original, replacement), 'utf8');
}

async function replaceInSource(dir, original, replacement) {
  const entries = await readdir(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await replaceInSource(file, original, replacement);
    } else if (/\.(?:js|jsx|css|html)$/.test(entry.name)) {
      const before = await readFile(file, 'utf8');
      if (before.includes(original)) {
        count += before.split(original).length - 1;
        await writeFile(file, before.replaceAll(original, replacement), 'utf8');
      }
    }
  }
  return count;
}

async function prepareApp(app, staged) {
  const source = path.join(root, app.source);
  await cp(source, staged, {
    recursive: true,
    filter: (item) => item === source || !omitted.has(path.relative(source, item).split(path.sep)[0]),
  });

  const sourceDir = path.join(staged, 'src');
  await replaceRequired(path.join(staged, 'index.html'), '<head>', `<head><base href="/${app.slug}/">`);
  if (app.slug === 'flow') {
    const icons = await replaceInSource(sourceDir, '/icons/', '/flow/icons/');
    const models = await replaceInSource(sourceDir, '/models/', '/flow/models/');
    if (!icons || !models) throw new Error('FLOW asset paths were not found');
  }
  if (app.slug === 'structure') {
    if (!(await replaceInSource(sourceDir, '/refs/', '/structure/refs/'))) {
      throw new Error('STRUCTURE asset paths were not found');
    }
  }
  if (app.slug === 'sys') {
    const assets = await replaceInSource(sourceDir, '/assets', '/sys/assets');
    const icons = await replaceInSource(sourceDir, '/icons/', '/sys/icons/');
    if (!assets || !icons) throw new Error('SYS asset paths were not found');
    // The source project's Sites deployment plugin is not needed in Netlify's static build.
    const config = path.join(staged, 'vite.config.js');
    await replaceRequired(config, "import { sites } from '@openai/sites-vite-plugin'", '');
    await replaceRequired(config, 'plugins: [react(), sites()]', 'plugins: [react()]');
  }
}

async function clearStaging() {
  await rm(stagingRoot, { recursive: true, force: true });
}

async function main() {
  insideRoot(stagingRoot);
  insideRoot(outputRoot);
  await clearStaging();
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(stagingRoot, { recursive: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(path.join(root, 'evaluation.js'), path.join(stagingRoot, 'evaluation.js'));
  await cp(path.join(root, 'evaluation.js'), path.join(outputRoot, 'evaluation.js'));
  await cp(path.join(root, 'index.html'), path.join(outputRoot, 'index.html'));
  await cp(path.join(root, 'home.css'), path.join(outputRoot, 'home.css'));
  await cp(path.join(root, 'icons'), path.join(outputRoot, 'icons'), { recursive: true });
  await cp(path.join(root, 'manuals'), path.join(outputRoot, 'manuals'), { recursive: true });

  for (const app of apps) {
    console.log(`\nBuilding ${app.source} → /${app.slug}/`);
    const staged = path.join(stagingRoot, app.slug);
    insideRoot(staged);
    await prepareApp(app, staged);
    if (useLocalDependencies) {
      const installedIn = ['cam', 'structure'].includes(app.slug) ? 'KIMM-CAD' : app.source;
      await cp(path.join(root, installedIn, 'node_modules'), path.join(staged, 'node_modules'), { recursive: true });
    } else {
      runNpm(['ci', '--no-audit', '--no-fund', '--prefer-offline'], staged);
    }
    runNpm(['run', 'build', '--', `--base=/${app.slug}/`], staged);
    if (app.refs) {
      await cp(path.join(staged, 'refs'), path.join(staged, 'dist', 'refs'), { recursive: true });
    }
    await cp(path.join(staged, 'dist'), path.join(outputRoot, app.slug), { recursive: true });
  }

  const required = [
    'index.html', 'home.css', 'evaluation.js',
    ...['CAD', 'CAM', 'Flow', 'STR', 'SYS'].map(name => `manuals/KIMM-${name} 사용자 평가용 튜토리얼.pdf`),
    ...apps.map(({ slug }) => `${slug}/index.html`),
    'flow/models/polyMesh/metadata.json',
    'flow/models/polyMesh/points.bin',
    'flow/models/polyMesh/indices.bin',
    'sys/assets/component-library/Connectivity__ElectricInterfaceC.png',
  ];
  for (const file of required) {
    await access(path.join(outputRoot, file));
  }

  await clearStaging();
  console.log(`\nReady to publish: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
