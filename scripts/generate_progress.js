const fs = require('fs');

const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === '.audit') continue;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

const allFiles = getFiles('./app').concat(getFiles('./lib'), getFiles('./prisma'), getFiles('./scripts'), getFiles('./types'));
// Exclude specific files if necessary, but this matches what we searched

const progress = allFiles.map((file, i) => {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const isBatch1 = [
    'app/admin/actions/assignment.actions.ts',
    'app/admin/actions/round.actions.ts',
    'app/admin/actions/upload.actions.ts',
    'app/admin/actions/user.actions.ts',
    'app/admin/actions/utils.ts'
  ].includes(normalized);

  return {
    file_path: normalized,
    status: isBatch1 ? 'completed' : 'pending',
    findings_count: isBatch1 ? getFindingsCount(normalized) : 0
  };
});

function getFindingsCount(filepath) {
  if (filepath === 'app/admin/actions/assignment.actions.ts') return 1;
  if (filepath === 'app/admin/actions/round.actions.ts') return 1;
  if (filepath === 'app/admin/actions/upload.actions.ts') return 2;
  if (filepath === 'app/admin/actions/user.actions.ts') return 1;
  return 0;
}

fs.writeFileSync('.audit/progress.json', JSON.stringify(progress, null, 2));
console.log('Generated .audit/progress.json');
