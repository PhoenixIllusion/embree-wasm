EMBREE_HEADERS=../embree/include/embree4/
GEN_FILE=build/gen.h

echo "// Generated Headers" >> $GEN_FILE
echo "" > $GEN_FILE
for file in \
  'buffer' 'builder_bvh' 'common' 'device' 'geometry' \
  'quaternion' 'scene_intersect' 'scene_occlude' 'scene_query' 'scene'
do
node parse_embree_header.mjs "idl/_${file}.idl" $EMBREE_HEADERS > "build/_${file}.h"
echo "  #include \"_${file}.h\" // _${file}.idl" >> $GEN_FILE
done
