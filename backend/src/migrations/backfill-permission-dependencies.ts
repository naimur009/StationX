import mongoose from 'mongoose';
import User from '../models/User';
import { expandPermissionsForUser, type PermissionEntry } from '../shared/permission-dependencies';

function arraysEqual(a: PermissionEntry[], b: PermissionEntry[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.module.localeCompare(y.module));
  const sortedB = [...b].sort((x, y) => x.module.localeCompare(y.module));
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i].module !== sortedB[i].module) return false;
    if (sortedA[i].actions.sort().join(',') !== sortedB[i].actions.sort().join(',')) return false;
  }
  return true;
}

async function migrate() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stationx';
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);

  const users = await User.find({ role: 'employee' }).lean();

  let wouldChange = 0;
  const changes: Array<{ userId: string; name: string; added: string[] }> = [];

  for (const user of users) {
    const current = (user.permissions ?? []) as PermissionEntry[];
    const expanded = expandPermissionsForUser(current);

    if (arraysEqual(current, expanded)) continue;

    wouldChange++;
    const addedModules = expanded
      .filter((e) => !current.find((c) => c.module === e.module))
      .map((e) => e.module);

    const moduleSummary = expanded.map((e) =>
      e.impliedBy ? `${e.module}(view, impliedBy:${e.impliedBy})` : `${e.module}(${e.actions.join(',')})`
    ).join(', ');

    console.log(`\n[${user._id}] ${user.name || user.email}`);
    console.log(`  Current:     ${current.map((c) => `${c.module}(${c.actions.join(',')})`).join(', ') || '(none)'}`);
    console.log(`  Expanded:    ${moduleSummary}`);
    if (addedModules.length > 0) {
      console.log(`  → Would add: ${addedModules.join(', ')}`);
    }

    changes.push({
      userId: user._id.toString(),
      name: user.name || user.email,
      added: addedModules,
    });
  }

  console.log(`\n\n=== Summary ===`);
  console.log(`Users examined:   ${users.length}`);
  console.log(`Would be updated: ${wouldChange}`);
  if (changes.length > 0) {
    console.log(`Changes:`);
    for (const c of changes) {
      console.log(`  ${c.userId} (${c.name}): +${c.added.join(', ')}`);
    }
  }

  const shouldApply = process.argv.includes('--apply');
  if (!shouldApply) {
    console.log('\nDry-run complete. Pass --apply to persist changes.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  for (const user of users) {
    const current = (user.permissions ?? []) as PermissionEntry[];
    const expanded = expandPermissionsForUser(current);
    if (arraysEqual(current, expanded)) continue;

    await User.findByIdAndUpdate(user._id, { $set: { permissions: expanded } });
    updated++;
  }

  console.log(`\nApplied: ${updated} user(s) updated.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
