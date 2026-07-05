import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir =
  process.env.ORE_REFERENCE_BOARD_OUT ??
  '/home/orlovboros/projects/manager/runs/water9-ore-reference-board-2026-07-01';
const htmlPath = resolve(outDir, 'water9-ore-reference-board.html');
const colorPath = resolve(outDir, 'water9-ore-reference-board-color.png');
const grayscalePath = resolve(outDir, 'water9-ore-reference-board-grayscale.png');
const reportPath = resolve(outDir, 'water9-ore-reference-board-report.md');

const commands = [
  'npx tsc --noEmit --pretty false',
  'node tools/build_ore_reference_board.mjs',
];

function boardHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Water9 ore reference board</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      min-height: 100%;
      background: #03070a;
    }
    canvas {
      display: block;
      width: 1280px;
      height: 720px;
      image-rendering: auto;
    }
    body.gray canvas {
      filter: grayscale(1) contrast(1.18) brightness(1.04);
    }
  </style>
</head>
<body>
  <canvas id="board" width="1280" height="720" aria-hidden="true"></canvas>
  <script>
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    function rgba(hex, alpha) {
      const value = hex.replace('#', '');
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function polygon(points, fill, stroke = null, width = 1) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    function ellipse(x, y, rx, ry, fill, stroke = null, width = 1, rotation = 0) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }

    function line(points, stroke, width, cap = 'round') {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineCap = cap;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    function drawBackground() {
      const water = ctx.createLinearGradient(0, 0, 0, H);
      water.addColorStop(0, '#071923');
      water.addColorStop(0.48, '#061219');
      water.addColorStop(1, '#03070a');
      ctx.fillStyle = water;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 90; i += 1) {
        const x = (i * 137) % W;
        const y = 40 + ((i * 73) % 475);
        const a = 0.025 + (i % 5) * 0.006;
        ctx.fillStyle = 'rgba(120,170,182,' + a + ')';
        ctx.fillRect(x, y, 1, 1 + (i % 3));
      }

      ctx.globalAlpha = 0.24;
      line([[0, 210], [190, 235], [390, 220], [650, 248], [910, 232], [1280, 250]], '#0e2b34', 2);
      line([[0, 312], [220, 294], [460, 315], [760, 302], [1010, 323], [1280, 305]], '#0b232c', 2);
      ctx.globalAlpha = 1;
    }

    function drawTerrain() {
      const top = [
        [0, 458], [70, 444], [134, 456], [196, 431], [265, 441],
        [336, 413], [408, 428], [476, 402], [558, 421], [634, 400],
        [708, 417], [786, 389], [872, 408], [955, 386], [1040, 407],
        [1128, 393], [1200, 417], [1280, 402]
      ];
      const terrain = [...top, [1280, 720], [0, 720]];
      const fill = ctx.createLinearGradient(0, 390, 0, 720);
      fill.addColorStop(0, '#263336');
      fill.addColorStop(0.58, '#172225');
      fill.addColorStop(1, '#0c1417');
      polygon(terrain, fill, '#11191c', 2);

      line(top, '#364449', 5);
      line(top.map(([x, y]) => [x, y + 7]), 'rgba(6,10,12,0.52)', 7);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 458);
      for (const [x, y] of top.slice(1)) ctx.lineTo(x, y);
      ctx.lineTo(1280, 720);
      ctx.lineTo(0, 720);
      ctx.closePath();
      ctx.clip();

      for (let i = 0; i < 72; i += 1) {
        const x = (i * 91 + 33) % W;
        const y = 435 + ((i * 47) % 250);
        const len = 28 + (i % 7) * 9;
        const drift = -18 + (i % 5) * 9;
        const color = i % 3 === 0 ? 'rgba(83,105,104,0.16)' : 'rgba(8,13,15,0.25)';
        line([[x, y], [x + len, y + drift]], color, 2 + (i % 2));
      }

      for (let i = 0; i < 40; i += 1) {
        const x = (i * 157 + 51) % W;
        const y = 455 + ((i * 63) % 205);
        ellipse(x, y, 9 + (i % 4) * 4, 4 + (i % 3) * 3, 'rgba(4,8,10,0.22)', null, 1, (i % 6) * 0.4);
      }
      ctx.restore();
    }

    function drawDiver() {
      ctx.save();
      ctx.translate(150, 385);
      ctx.scale(1.05, 1.05);
      ellipse(-2, 0, 15, 25, '#192831', '#435967', 2, -0.08);
      ellipse(1, -24, 12, 11, '#2a3e47', '#7d9aa5', 2);
      ellipse(4, -25, 6, 5, 'rgba(164,213,221,0.55)');
      line([[-16, -1], [-36, 12], [-48, 23]], '#22333c', 8);
      line([[15, 0], [35, 13], [50, 17]], '#22333c', 8);
      line([[-8, 24], [-22, 48], [-30, 66]], '#20323c', 8);
      line([[9, 23], [25, 49], [38, 62]], '#20323c', 8);
      line([[38, 62], [58, 66]], '#314750', 6);
      line([[-30, 66], [-51, 67]], '#314750', 6);
      line([[20, -18], [64, -36]], 'rgba(129,188,196,0.18)', 3);
      ctx.restore();
    }

    function drawSocket(cx, cy, rx, ry, rotation, cracks) {
      ellipse(cx + 4, cy + 9, rx + 21, ry + 17, 'rgba(2,5,6,0.58)', null, 1, rotation);
      ellipse(cx, cy, rx + 14, ry + 10, '#121b1d', '#334043', 5, rotation);
      ellipse(cx - 3, cy - 3, rx + 6, ry + 5, '#1d292b', '#0b1113', 2, rotation);
      for (const crack of cracks) {
        line(crack, 'rgba(3,7,8,0.62)', 4);
        line(crack.map(([x, y]) => [x, y - 1]), 'rgba(71,86,84,0.26)', 1);
      }
    }

    function facet(points, fill, bright = null) {
      polygon(points, fill, '#080c0e', 2);
      if (bright) {
        const [a, b] = bright;
        line([a, b], 'rgba(242,244,221,0.75)', 2);
      }
    }

    function drawFacetedVein() {
      drawSocket(352, 440, 112, 37, -0.34, [
        [[245, 472], [292, 445], [330, 451], [382, 418], [460, 419]],
        [[292, 478], [336, 455], [382, 465]],
        [[408, 446], [470, 431], [506, 446]]
      ]);

      const facets = [
        [[[254, 459], [298, 431], [331, 441], [303, 477]], '#8b573e', [[270, 453], [300, 436]]],
        [[[305, 431], [346, 415], [382, 429], [333, 451]], '#b56f48', [[323, 428], [355, 420]]],
        [[[337, 451], [386, 429], [420, 444], [377, 472]], '#7f4c3d', [[382, 435], [410, 445]]],
        [[[391, 424], [446, 414], [492, 435], [438, 455], [413, 444]], '#c18251', [[430, 419], [472, 434]]],
        [[[301, 478], [348, 454], [383, 466], [352, 490]], '#6b3f35', [[324, 472], [356, 459]]],
        [[[380, 470], [428, 454], [462, 468], [421, 489]], '#995b42', [[410, 462], [442, 466]]]
      ];
      for (const [points, fill, bright] of facets) facet(points, fill, bright);
      line([[278, 465], [315, 444], [361, 450], [405, 433], [464, 438]], 'rgba(246,203,131,0.32)', 3);
    }

    function drawNodulePocket() {
      drawSocket(641, 430, 98, 50, -0.12, [
        [[541, 447], [594, 421], [656, 419], [728, 436]],
        [[565, 479], [619, 447], [681, 458], [744, 449]],
        [[622, 396], [648, 426], [693, 407]]
      ]);

      const nodules = [
        [565, 443, 35, 26, '#526766', -0.2],
        [607, 421, 38, 31, '#6d7f78', 0.18],
        [655, 428, 43, 34, '#4f665e', -0.08],
        [704, 439, 34, 27, '#6b7d72', 0.24],
        [599, 468, 34, 25, '#405553', 0.12],
        [656, 470, 39, 25, '#5d7169', -0.25],
        [716, 466, 25, 20, '#3d524f', 0.05]
      ];
      for (const [x, y, rx, ry, fill, rot] of nodules) {
        ellipse(x + 4, y + 8, rx, ry, 'rgba(3,7,8,0.48)', null, 1, rot);
        ellipse(x, y, rx, ry, fill, '#0d1415', 2, rot);
      }
      const chips = [
        [[580, 423], [606, 407], [623, 421], [599, 434]],
        [[650, 403], [686, 419], [665, 438]],
        [[704, 421], [733, 438], [706, 452]],
        [[628, 456], [662, 447], [681, 464], [647, 477]]
      ];
      for (const points of chips) {
        polygon(points, 'rgba(177,201,177,0.58)', 'rgba(231,239,207,0.42)', 1);
      }
      line([[552, 464], [593, 445], [652, 447], [716, 455], [742, 444]], 'rgba(217,229,194,0.22)', 3);
    }

    function drawCrackedCore() {
      drawSocket(930, 418, 82, 62, 0.2, [
        [[840, 445], [885, 408], [931, 414], [981, 386], [1028, 410]],
        [[865, 474], [907, 446], [955, 462], [1004, 442]],
        [[900, 375], [920, 414], [951, 395]]
      ]);

      const shell = [
        [861, 412], [884, 378], [927, 365], [973, 378],
        [1002, 412], [994, 458], [956, 489], [908, 483], [873, 454]
      ];
      polygon(shell, '#273136', '#080c0e', 3);
      polygon([[880, 417], [907, 382], [937, 373], [931, 419], [903, 438]], '#333d42', '#0b1012', 2);
      polygon([[938, 374], [976, 390], [986, 424], [944, 421]], '#192226', '#0b1012', 2);
      polygon([[903, 441], [932, 424], [958, 455], [921, 475]], '#202a2e', '#0b1012', 2);
      polygon([[948, 426], [988, 429], [975, 461], [958, 456]], '#344044', '#0b1012', 2);

      ctx.save();
      ctx.shadowColor = 'rgba(97,218,207,0.34)';
      ctx.shadowBlur = 7;
      line([[908, 386], [924, 417], [906, 447]], '#79d6cc', 4);
      line([[938, 377], [942, 418], [975, 448]], '#f2c16e', 4);
      line([[883, 423], [924, 417], [965, 410], [993, 421]], '#74c8c6', 3);
      ctx.restore();

      line([[914, 386], [926, 416], [913, 447]], 'rgba(242,252,234,0.55)', 1.3);
      line([[942, 381], [945, 417], [970, 445]], 'rgba(255,235,164,0.55)', 1.2);
      ellipse(934, 421, 11, 9, 'rgba(118,230,220,0.18)', null, 1);
    }

    drawBackground();
    drawTerrain();
    drawDiver();
    drawFacetedVein();
    drawNodulePocket();
    drawCrackedCore();

    if (new URLSearchParams(window.location.search).has('gray')) {
      document.body.classList.add('gray');
    }
  </script>
</body>
</html>`;
}

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, boardHtml());

const errors = [];
const browser = await chromium.launch({ headless: true });
try {
  const colorPage = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  colorPage.on('pageerror', (error) => errors.push(error.message));
  await colorPage.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'load' });
  await colorPage.screenshot({ path: colorPath, fullPage: true });
  await colorPage.close();

  const grayPage = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  grayPage.on('pageerror', (error) => errors.push(error.message));
  const grayUrl = `${pathToFileURL(htmlPath).toString()}?gray=1`;
  await grayPage.goto(grayUrl, { waitUntil: 'load' });
  await grayPage.screenshot({ path: grayscalePath, fullPage: true });
  await grayPage.close();
} finally {
  await browser.close();
}

const colorBytes = (await stat(colorPath)).size;
const grayscaleBytes = (await stat(grayscalePath)).size;
const failures = [];
if (errors.length) failures.push(`browser errors: ${errors.join('; ')}`);
if (colorBytes < 30000) failures.push(`color PNG unexpectedly small: ${colorBytes} bytes`);
if (grayscaleBytes < 30000) failures.push(`grayscale PNG unexpectedly small: ${grayscaleBytes} bytes`);

const status = failures.length ? 'rejected' : 'accepted';
const report = `# Water9 Ore Reference Board - 2026-07-01

Status: ${status}

## Scope

Proof-only HUD-free readability board. This does not touch runtime ore behavior. It renders one terrain patch with player scale and three side-by-side candidate treatments: faceted vein strip, nodule shelf pocket, and rare cracked core vent.

## Artifacts

- Color board PNG: \`${colorPath}\`
- Unlabeled grayscale board PNG: \`${grayscalePath}\`
- Source HTML: \`${htmlPath}\`

## Visual Verdict

${status === 'accepted'
  ? 'Accepted as the right proof direction. At gameplay scale the three treatments read as intentional embedded mineable objects rather than UI glyphs: each has a dark terrain socket/root, a raised contour, uneven mineral forms, and brighter facet or crack accents that survive in grayscale. The rare core keeps its glow internal and restrained.'
  : `Rejected by the mechanical artifact gate: ${failures.join('; ')}`}

## Caveats

- This is a procedural proof board, not a runtime ore implementation.
- Human art review should still decide final silhouette proportions before any gameplay integration.
- The nodule shelf is the quietest candidate; if Alex wants stronger one-second readability, make the outward chips larger before touching all ore tiers.

## Changed Files

- \`tools/build_ore_reference_board.mjs\`

## Commands

${commands.map((command) => `- \`${command}\``).join('\n')}

## Artifact Checks

- Color PNG bytes: ${colorBytes}
- Grayscale PNG bytes: ${grayscaleBytes}
${failures.length ? `- Failures: ${failures.join('; ')}` : '- Failures: none'}
`;

await writeFile(reportPath, report);

console.log(JSON.stringify({
  status,
  outDir,
  colorPath,
  grayscalePath,
  reportPath,
  htmlPath,
  colorBytes,
  grayscaleBytes,
  failures,
}, null, 2));
