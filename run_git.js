const { execSync } = require('child_process');
const fs = require('fs');
try {
    const status = execSync('git status').toString();
    fs.writeFileSync('git_status_out.txt', status);
    const push = execSync('git push origin main').toString();
    fs.appendFileSync('git_status_out.txt', '\n--- PUSH ---\n' + push);
} catch (e) {
    fs.writeFileSync('git_status_out.txt', e.toString() + '\n' + (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : ''));
}