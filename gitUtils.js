const { execSync } = require('child_process');

function execGit(command) {
  return execSync(command, { encoding: 'utf-8' }).trim();
}

function getChangedFiles(targetBranch, featureBranch) {
  return execGit(`git diff --name-only ${targetBranch}...${featureBranch}`).split('\n');
}

function getFileDiff(targetBranch, featureBranch, file) {
  return execGit(`git diff ${targetBranch}...${featureBranch} -- ${file}`);
}

module.exports = {
  execGit,
  getChangedFiles,
  getFileDiff,
};
