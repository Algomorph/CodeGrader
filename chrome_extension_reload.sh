#!/bin/bash

# Programmatically reload extensions in the Chrome browser, to ease testing changes in chrome
# (e.g. can be tied to a shortcut in your text editor or IDE)
# requires the Extension Reloader extension to be installed in Chrome (https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
# To set up on WebStorm on Windows, add a Shell Script Run Configuration (see https://www.jetbrains.com/help/idea/shell-scripts.html#run-shell-scripts)
# pointing to this script in "Script path"

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    CYGWIN*)    machine=Cygwin;;
    MINGW*)     machine=MinGw;;
    *)          machine="UNKNOWN:${unameOut}"
esac

case "$machine" in
MinGw)
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --new-window http://reload.extensions
  ;;
Cygwin)
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --new-window http://reload.extensions
  ;;
Linux)
 google-chrome --new-window http://reload.extensions
 ;;
esac