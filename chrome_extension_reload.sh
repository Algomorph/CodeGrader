#!/bin/bash

# Programmatically reload extensions in the Chrome browser, to ease testing changes in chrome
# (e.g. can be tied to a shortcut in your text editor or IDE)
# requires the Extension Reloader extension to be installed in Chrome (https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
# To set up on WebStorm on Windows, add a Shell Script Run Configuration (see https://www.jetbrains.com/help/idea/shell-scripts.html#run-shell-scripts)
# pointing to this script in "Script path"

unameOut="$(uname -s)"
case "${unameOut}" in
Linux*) machine=Linux ;;
Darwin*) machine=Mac ;;
CYGWIN*) machine=Cygwin ;;
MINGW*) machine=MinGw ;;
*) machine="UNKNOWN:${unameOut}" ;;
esac

case "$machine" in
MinGw)
  # Windows 10 version:
  if test -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; then
    # Windows 10 version:
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --new-window http://reload.extensions
  else
    # Windows 11 version:
    "/c/Program Files/Google/Chrome/Application/chrome.exe" --new-window http://reload.extensions
  fi
  ;;
Cygwin)
  if test -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; then
    # Windows 10 version:
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --new-window http://reload.extensions
  else
    # Windows 11 version:
    "/c/Program Files/Google/Chrome/Application/chrome.exe" --new-window http://reload.extensions
  fi
  ;;
Linux)
  google-chrome --new-window http://reload.extensions
  ;;
Mac)
  open -a "Google Chrome" http://reload.extensions
  ;;
*)
  echo "OS '$machine' not supported by chrome_extension_reload.sh script"
  ;;
esac
