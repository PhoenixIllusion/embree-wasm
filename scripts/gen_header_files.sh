#!/bin/bash
set -e

EMBREE_HEADERS=$1
IDL_DIRECTORY=$2
PARSER_DIRECTORY=$3
GEN_FILE=gen.h
mkdir -p 'gen'
echo "// Generated Headers" >> $GEN_FILE
echo "" > $GEN_FILE
for file in \
  'buffer' 'builder_bvh' 'common' 'device' 'geometry' \
  'quaternion' 'scene_intersect' 'scene_occlude' 'scene_query' 'scene'
do
node "${PARSER_DIRECTORY}/parse_embree_header.mjs" "${IDL_DIRECTORY}/_${file}.idl" $EMBREE_HEADERS > "gen/_${file}.h"
echo "  #include \"gen/_${file}.h\" // _${file}.idl" >> $GEN_FILE
done
