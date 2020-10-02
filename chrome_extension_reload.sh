#!/bin/bash

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