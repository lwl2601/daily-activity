import { randomInt } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT_MESSAGES = [
  'chore: update daily activity log',
  'chore(tracker): append heartbeat entry',
  'docs: refresh activity metrics',
  'refactor: reorganize daily snapshot data',
  'feat(log): record automated checkpoint',
  'chore(sync): sync daily progress counter',
  'perf: optimize activity state entry',
  'chore(metrics): register daily contribution tick',
  'docs(changelog): update daily status note',
  'chore: rotate daily timestamp ledger',
  'feat(metrics): add routine telemetry pulse',
  'refactor(log): normalize timestamp batch'
];

export function getRandomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    throw new RangeError(`Intervalo inválido: min=${min}, max=${max}`);
  }
  return randomInt(min, max + 1);
}

export function pickRandomMessages(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = randomInt(0, COMMIT_MESSAGES.length);
    result.push(COMMIT_MESSAGES[idx]);
  }
  return result;
}

export function formatIsoWithOffset(year, month, day, hour, minute, second, offset = '-03:00') {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${offset}`;
}

export function generateTimestampsForDay(dateStr, count, offset = '-03:00') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Data inválida (esperado YYYY-MM-DD): ${dateStr}`);
  }
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Gera horários aleatórios entre 08:00:00 (28800s) e 23:20:00 (84000s)
  const startSec = 8 * 3600;
  const endSec = 23 * 3600 + 20 * 60;
  const secondsList = [];

  for (let i = 0; i < count; i++) {
    secondsList.push(randomInt(startSec, endSec));
  }
  secondsList.sort((a, b) => a - b);

  return secondsList.map((totalSec) => {
    const hour = Math.floor(totalSec / 3600);
    const minute = Math.floor((totalSec % 3600) / 60);
    const second = totalSec % 60;
    return formatIsoWithOffset(year, month, day, hour, minute, second, offset);
  });
}

export function generateDateRange(daysBack, referenceDate = new Date()) {
  if (!Number.isInteger(daysBack) || daysBack < 1) {
    throw new RangeError(`daysBack deve ser inteiro >= 1. Recebido: ${daysBack}`);
  }
  const dates = [];
  const base = new Date(Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ));

  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

export function buildCommitPlan({ mode = 'daily', min = 10, max = 20, days = 365, referenceDate = new Date() }) {
  const targetDates = mode === 'backfill'
    ? generateDateRange(days, referenceDate)
    : generateDateRange(1, referenceDate).slice(-1);

  const plan = [];
  for (const dateStr of targetDates) {
    const count = getRandomInt(min, max);
    const timestamps = generateTimestampsForDay(dateStr, count);
    const messages = pickRandomMessages(count);

    for (let i = 0; i < count; i++) {
      plan.push({
        date: dateStr,
        timestamp: timestamps[i],
        message: messages[i],
        indexInDay: i + 1,
        totalInDay: count
      });
    }
  }
  return plan;
}

export function parseArgs(argv) {
  const opts = {
    mode: 'daily',
    min: 10,
    max: 20,
    days: 365,
    dryRun: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--mode=')) opts.mode = arg.split('=')[1];
    else if (arg.startsWith('--min=')) opts.min = Number(arg.split('=')[1]);
    else if (arg.startsWith('--max=')) opts.max = Number(arg.split('=')[1]);
    else if (arg.startsWith('--days=')) opts.days = Number(arg.split('=')[1]);
  }
  return opts;
}

function getGitConfig(repoDir, key, fallback) {
  try {
    return execFileSync('git', ['config', key], { cwd: repoDir, encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function formatStatePayload(item) {
  return JSON.stringify(
    {
      date: item.date,
      timestamp: item.timestamp,
      commitInDay: item.indexInDay,
      totalInDay: item.totalInDay,
      message: item.message,
      nonce: randomInt(100000, 999999)
    },
    null,
    2
  ) + '\n';
}

function executeFastImport(plan, repoDir) {
  const authorName = getGitConfig(repoDir, 'user.name', 'Léo Wisbistcki Ludwig');
  const authorEmail = getGitConfig(repoDir, 'user.email', 'leoludwig26@gmail.com');
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: repoDir,
    encoding: 'utf8'
  }).trim();

  const chunks = [];

  plan.forEach((item, index) => {
    const content = formatStatePayload(item);
    const unixSeconds = Math.floor(new Date(item.timestamp).getTime() / 1000);
    const msgBuf = Buffer.from(item.message, 'utf8');
    const contentBuf = Buffer.from(content, 'utf8');

    chunks.push(`commit refs/heads/${branch}\n`);
    chunks.push(`author ${authorName} <${authorEmail}> ${unixSeconds} -0300\n`);
    chunks.push(`committer ${authorName} <${authorEmail}> ${unixSeconds} -0300\n`);
    chunks.push(`data ${msgBuf.byteLength}\n${item.message}\n`);
    if (index === 0) {
      chunks.push(`from refs/heads/${branch}^0\n`);
    }
    chunks.push(`M 100644 inline data/activity-state.json\n`);
    chunks.push(`data ${contentBuf.byteLength}\n${content}\n`);
  });

  chunks.push('done\n');
  execFileSync('git', ['fast-import', '--done', '--quiet'], {
    cwd: repoDir,
    input: chunks.join(''),
    maxBuffer: 64 * 1024 * 1024
  });
  execFileSync('git', ['reset', '--hard', 'HEAD'], { cwd: repoDir, stdio: 'ignore' });
}

export function executeCommitPlan(plan, repoDir, dryRun = false) {
  const stateFile = resolve(repoDir, 'data', 'activity-state.json');
  const dir = dirname(stateFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (dryRun || plan.length === 0) {
    return;
  }

  if (plan.length > 30) {
    executeFastImport(plan, repoDir);
    return;
  }

  for (const item of plan) {
    writeFileSync(stateFile, formatStatePayload(item), 'utf8');
    execFileSync('git', ['add', 'data/activity-state.json'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', item.message, '--date', item.timestamp], {
      cwd: repoDir,
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: item.timestamp,
        GIT_COMMITTER_DATE: item.timestamp
      }
    });
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const plan = buildCommitPlan(opts);

  const uniqueDays = new Set(plan.map((p) => p.date)).size;
  console.log(`Modo: ${opts.mode} | Dias: ${uniqueDays} | Total de commits planejados: ${plan.length} (entre ${opts.min} e ${opts.max}/dia)`);

  if (opts.dryRun) {
    console.log('Dry-run concluído. Exemplo dos primeiros 5 commits:');
    for (const sample of plan.slice(0, 5)) {
      console.log(`  ${sample.timestamp} -> ${sample.message} (${sample.indexInDay}/${sample.totalInDay})`);
    }
  } else {
    executeCommitPlan(plan, repoDir, false);
    console.log(`Sucesso! ${plan.length} commits criados no repositório.`);
  }
}
