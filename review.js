require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { execGit, getChangedFiles, getFileDiff } = require('./gitUtils');
const { reviewWithCody } = require('./aiReview');
const { buildReviewMessages } = require('./promptBuilder');
const { saveResults } = require('./aggregator');

const OUTPUT_DIR = 'output';
const DIFF_DIR = path.join(OUTPUT_DIR, 'diffs');
const RESULT_FILE = path.join(OUTPUT_DIR, 'review-result.json');

const REPO_URL = 'https://github.com/samdofreelancer/money-keeper.git';
const REPO_DIR = 'money-keeper';

async function runReview(branchName, targetBranch) {
  if (!fs.existsSync(REPO_DIR)) {
    console.log(`Cloning repository from ${REPO_URL}...`);
    const { execSync } = require('child_process');
    execSync(`git clone ${REPO_URL}`, { stdio: 'inherit' });
    console.log('Fetching all remote branches...');
    execSync(`git fetch --all`, { stdio: 'inherit' });
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR);

  console.log(`Checking out target branch ${targetBranch}...`);
  execGit(`git checkout ${targetBranch}`);

  const changedFiles = getChangedFiles(targetBranch, branchName);
  console.log('Changed files:', changedFiles);

  const results = [];

  for (const file of changedFiles) {
    const diff = getFileDiff(targetBranch, branchName, file);
    if (!diff) continue;

    const diffPath = path.join(DIFF_DIR, file.replace(/[\\/]/g, '_') + '.diff');
    fs.writeFileSync(diffPath, diff);

    console.log(`Reviewing ${file}...`);
    let messages = buildReviewMessages(file, diff);
    console.log(`Messages for ${file}:`, messages);
    if (!messages || messages.length === 0) {
      console.warn(`No messages generated for ${file}. Skipping review.`);
      continue;
    }

    const review = await reviewWithCody(file, diff, messages);
    if (!review) {
      console.warn(`No review response received for ${file}. Skipping.`);
      continue;
    }
    console.log(`Review response received for ${file}:`, review);

    if (review && review.issues) {
      results.push({ fileName: file, issues: review.issues });
    }
  }

  if (results.length === 0) {
    console.log('No issues found in the review.');
    return;
  }
  saveResults(results);
  console.log(`\n✅ Review completed. Results saved to ${RESULT_FILE}`);
}

const [,, branchName, targetBranch] = process.argv;
if (!branchName || !targetBranch) {
  console.error('Usage: node review.js <branch_name> <target_branch>');
  process.exit(1);
}

runReview(branchName, targetBranch);
