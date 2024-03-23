cmake_minimum_required(VERSION 3.13 FATAL_ERROR)
set(CMAKE_POLICY_DEFAULT_CMP0077 NEW)

FIND_PACKAGE(Python3)
set(PYTHON ${Python3_EXECUTABLE} CACHE STRING "Python path")
set(EMSCRIPTEN_ROOT $ENV{EMSDK}/upstream/emscripten CACHE STRING "Emscripten path")
set(CMAKE_TOOLCHAIN_FILE ${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake)
set(WEBIDL_BINDER_SCRIPT ${EMSCRIPTEN_ROOT}/tools/webidl_binder.py)
set(OUTPUT_FOLDER ${CMAKE_CURRENT_SOURCE_DIR}/dist/)
set(TYPING_D_TS ${OUTPUT_FOLDER}embree.d.ts)
set(IDL_PART_DIR ${CMAKE_CURRENT_SOURCE_DIR}/idl/)
set(SCRIPT_DIR ${CMAKE_CURRENT_SOURCE_DIR}/scripts/)
set(GEN_NEW_IDL ${SCRIPT_DIR}/gen_idl_file.sh)
set(GEN_NEW_HEADER ${SCRIPT_DIR}/gen_header_files.sh)
set(EMBREE_IDL_H ${CMAKE_CURRENT_SOURCE_DIR}/embree_idl.h)

# The configurations we support
set(CMAKE_CONFIGURATION_TYPES "Debug;Release;Distribution")

FILE(GLOB IDL_PARTS ${CMAKE_CURRENT_SOURCE_DIR}/idl)

set(EMBREE_IDL embree.idl)
set(GEN_HEADER gen.h)

# Include Embree
include(FetchContent)
FetchContent_Declare(embree
    GIT_REPOSITORY https://github.com/embree/embree.git
    GIT_TAG 0c236df6f31a8e9c8a48803dada333e9ea0029a6
    GIT_SHALLOW TRUE
)

set(EMBREE_TUTORIALS OFF CACHE BOOL "" FORCE)
set(EMBREE_TASKING_SYSTEM INTERNAL "" FORCE)
set(EMBREE_STATIC_LIB ON CACHE BOOL "" FORCE)
set(FLAGS_SSE2 "-msse -msse2")

FetchContent_MakeAvailable(embree)

set(EMBREE_INCLUDE ${embree_SOURCE_DIR}/include)
set(EMBREE_STATIC_LIBS
  ${embree_BINARY_DIR}/libembree4.a
  ${embree_BINARY_DIR}/liblexers.a
  ${embree_BINARY_DIR}/libmath.a
  ${embree_BINARY_DIR}/libsimd.a
  ${embree_BINARY_DIR}/libsys.a
  ${embree_BINARY_DIR}/libtasking.a
)

set(TOTAL_MEMORY 32MB CACHE STRING "Total Memory")
set(STACK_SIZE 1MB CACHE STRING "Stack Size")

# Enable for resizable heap, with some amount of slowness
set(ALLOW_MEMORY_GROWTH 0 CACHE STRING "Allow Memory Growth")

set(EMCC_ARGS
  -s WASM=1
  --no-entry 
  -s MODULARIZE=1 
  -s EXPORT_ES6=1 
  -s NO_EXIT_RUNTIME=1 
  -s NO_FILESYSTEM=1 
  -s EXPORT_NAME="Embree" 
  -s TOTAL_MEMORY=${TOTAL_MEMORY} 
  -s STACK_SIZE=${STACK_SIZE} 
  -s ALLOW_MEMORY_GROWTH=${ALLOW_MEMORY_GROWTH}
  -mavx -msimd128 -std=c++17
  -sEXPORTED_FUNCTIONS=[_malloc,_free]
  -I ${CMAKE_CURRENT_SOURCE_DIR}
  -I ${EMBREE_INCLUDE}
  -include ${CMAKE_CURRENT_SOURCE_DIR}/embree_idl.h
)

if ("${CMAKE_BUILD_TYPE}" STREQUAL "Debug")
	set(EMCC_ARGS 
		${EMCC_ARGS} 
		-g
		-s ASSERTIONS)
else()
	set(EMCC_ARGS 
		${EMCC_ARGS}
		-O3)
endif()

set(EMCC_GLUE_ARGS
  -c
  -I .
  -I ${EMBREE_INCLUDE}
  -include ${CMAKE_CURRENT_SOURCE_DIR}/embree_idl.h
  -Wall
  -mavx -msimd128 -std=c++17)


#######################################
project("Embree-Wasm")

add_custom_command(
  OUTPUT ${EMBREE_IDL}
  COMMAND sh ${GEN_NEW_IDL} ${IDL_PART_DIR} > ${EMBREE_IDL}
  DEPENDS ${IDL_PARTS}
  COMMENT "Generating ${EMBREE_IDL}"
  VERBATIM)

add_custom_command(
  OUTPUT ${GEN_HEADER}
  COMMAND sh ${GEN_NEW_HEADER} ${EMBREE_INCLUDE}/embree4 ${IDL_PART_DIR} ${SCRIPT_DIR}
  DEPENDS ${IDL_PARTS}
  COMMENT "Generating IDL Headers from Embree Source"
  VERBATIM)

add_custom_command(
  OUTPUT ${TYPING_D_TS}
  COMMAND npx webidl-dts-gen -e -d -i embree.idl -o ${TYPING_D_TS} -n Embree
  DEPENDS ${EMBREE_IDL}
  COMMENT "Generating Typescript Typing from IDL"
  VERBATIM)

add_custom_target(Embree-Wasm-generated ALL DEPENDS ${EMBREE_IDL} ${GEN_HEADER} ${TYPING_D_TS})
#######################################
add_custom_command(
  OUTPUT glue.cpp glue.js
  COMMAND ${PYTHON} ${WEBIDL_BINDER_SCRIPT} ${EMBREE_IDL} glue
  DEPENDS ${EMBREE_IDL} 
  COMMENT "Generating WebIDL bindings"
  VERBATIM)
add_custom_command(
  OUTPUT glue.o
  COMMAND emcc glue.cpp ${EMCC_GLUE_ARGS} -o glue.o
  DEPENDS glue.cpp ${EMBREE_IDL_H}
  COMMENT "Building WebIDL bindings.o"
  VERBATIM)
add_custom_target(Embree-Wasm-bindings ALL DEPENDS glue.js glue.o)

#######################################
add_custom_command(
  OUTPUT ${OUTPUT_FOLDER}embree.js ${OUTPUT_FOLDER}embree.wasm
  COMMAND emcc glue.o ${EMBREE_STATIC_LIBS}  ${EMCC_ARGS} -o ${OUTPUT_FOLDER}embree.js
  DEPENDS Embree-Wasm-bindings Embree-Wasm-generated embree ${EMBREE_LIBRARIES}
  COMMENT "Building Embree.js webassembly"
  VERBATIM)
add_custom_target(Embree-wasm ALL DEPENDS ${OUTPUT_FOLDER}embree.js ${OUTPUT_FOLDER}embree.wasm)
