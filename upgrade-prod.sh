#!/bin/sh

set -e

echo "WARNING: This script will upgrade the production environment."
echo "This operation should only be performed when you are certain about the changes."
echo "If you are unsure, press 'n' to cancel."
echo
read -p "Do you want to continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo
echo "Have you fully tested these changes on https://shipwrecked-staging.hackclub.com?"
echo "If not, please test there first before proceeding to production."
echo
read -p "Have you tested on staging? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled. Please test on staging first."
    exit 1
fi

# Check upstream remote configuration
upstream_url=$(git remote get-url upstream 2>/dev/null || echo "")
if [ "$upstream_url" != "git@github.com:hackclub/shipwrecked.git" ]; then
    echo "Error: Upstream remote is not configured correctly."
    echo "Expected: git@github.com:hackclub/shipwrecked.git"
    echo "Found: $upstream_url"
    echo
    echo "Please configure the upstream remote with:"
    echo "git remote add upstream git@github.com:hackclub/shipwrecked.git"
    exit 1
fi

# Check if we're on the main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    echo "Error: You must be on the main branch to run this script."
    echo "Current branch: $current_branch"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "Error: You have uncommitted changes in your working directory."
    echo "Please commit or stash your changes before running this script."
    git status
    exit 1
fi

# Continue with the rest of the upgrade process...
git fetch upstream main
git rebase upstream/main
git checkout production
git rebase main
git push upstream production
echo "SUCCESS!  Rebased main into production!"

exit 0
