#!/bin/bash
set -e

mkdir -p ./dist
rm -fr ./dist/embree*
rm -fr build/embree.idl build/gen* 
emcmake cmake -B build . -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
cp ./dist/embree* ./vite/src/em/.