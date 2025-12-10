
const { exec } = require('child_process');

console.log('Checking for TypeScript errors...');

exec('npx tsc --noEmit', { cwd: 'c:/Users/LHA-M/erp-system/backend' }, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Compilation Errors Found:');
        console.error(stdout);
    } else {
        console.log('✅ Compilation Successful! No errors found.');
    }
});
