#!/bin/bash
set -e

branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

if [ "$branch" != "development" ] ; then
  echo "You must be on the development branch"
  exit 2
fi

buildBranch="release-prep"
rollbarToken="2765e152671441fabf6a884fd00a383b"

git checkout -b $buildBranch
grunt

ver=$(sed -n -e 's/^.*ver="\([^\"]*\)".*$/\1/p' ./build/index.html)

git add -A
git commit -a -m "Preparing for release."
git checkout master
git merge --no-ff $buildBranch -X theirs -m "Merge release branch into master"
git tag -a v$ver -m 'version $ver'

curl https://api.rollbar.com/api/1/sourcemap \
  -F access_token=$rollbarToken \
  -F version=$ver \
  -F minified_url=http://plaster.eli-white.com/javascript/main.min.js \
  -F source_map=@build/javascript/main.min.js.map

rm build/javascript/main.min.js.map

cd build
git add -A
git commit -a -m "Release version $ver"
cd ..

git checkout development
git branch -D $buildBranch

echo "Deploy to Production? y/n"
read deploy

if [ "$deploy" = "y" ] ; then
  cd build
  git push origin master:gh-pages

  LOCAL_USERNAME=`whoami`

  curl https://api.rollbar.com/api/1/deploy/ \
    -F access_token=$rollbarToken \
    -F environment=production \
    -F revision=$ver \
    -F local_username=$LOCAL_USERNAME
  cd ..
fi