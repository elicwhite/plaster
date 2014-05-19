#!/bin/bash

branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

if [ "$branch" != "master" ] ; then
  echo "You must be on master"
  exit 2
fi

echo "What version number?"
read version

if [ "$version" = "" ] ; then
  echo "You must specify a version number"
  exit 2
fi

buildBranch="release-v$version"

git checkout -b $buildBranch
grunt
git add -A
git commit -a -m "Preparing for release."
git checkout integration
git merge --no-ff $buildBranch -X theirs -m "Merge branch '$buildBranch' into integration"
git checkout master
git branch -D $buildBranch

echo "Deploy? y/n"
read deploy

if [ "$deploy" = "y" ] ; then
  git push staging integration:master
fi
