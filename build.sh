mkdir -p dist
rm -r dist/embree*

emcmake cmake -B build .
cmake --build build -j
cp dist/embree* vite/src/em/.
