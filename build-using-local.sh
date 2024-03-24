#!/bin/bash
set -e

mkdir -p ./dist
rm -fr ./dist/embree*

emcmake cmake -B build . 
cmake --build build -j "${@}"
cp ./dist/embree* ./vite/src/em/.
