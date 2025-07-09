const { execSync } = require('child_process');

const REPO_DIR = 'money-keeper';

function execGit(command) {
  return execSync(`cd ${REPO_DIR} && ${command}`, { encoding: 'utf-8' }).trim();
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
