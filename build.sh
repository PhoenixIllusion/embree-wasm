#cp ../embree/build/*.a lib/.

EMSCRIPTEN_ROOT=~/emscripten/emsdk/upstream/emscripten

sh gen_idl_file.sh 
pushd build
"${EMSCRIPTEN_ROOT}/tools/webidl_binder" embree.idl glue
popd
sh gen_header_files.sh
DEBUG_FLAG=-O3
#DEBUG_FLAG=-g --gseperate-dwarf -fexceptions -s ASSERTIONS=1

emcc -c \
  -O3 \
  -I ../embree/include \
  -I ../embree/common \
  -include ./embree_idl.h \
  build/glue.cpp \
  -o build/glue.o \
  -mavx -msimd128 -std=c++17

emcc -s WASM=1 --no-entry \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s NO_EXIT_RUNTIME=1 \
  -s NO_FILESYSTEM=1 \
  -s EXPORT_NAME="Embree" \
  -s TOTAL_MEMORY=32MB \
  -s STACK_SIZE=1048576 \
  --post-js build/glue.js \
  build/glue.o \
  lib/libembree4.a \
  lib/liblexers.a \
  lib/libmath.a \
  lib/libsimd.a \
  lib/libsys.a \
  lib/libtasking.a \
  -o vite/src/em/embree.js \
  -mavx -msimd128 -std=c++17 -sEXPORTED_FUNCTIONS=[_malloc,_free]

npx webidl-dts-gen -e -d -i ./build/embree.idl -o ./vite/src/em/embree.d.ts -n Embree
