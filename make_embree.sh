emcmake cmake .. -DCMAKE_BUILD_TYPE=Debug -DEMBREE_TUTORIALS=OFF -DEMBREE_TASKING_SYSTEM=INTERNAL -DEMBREE_MAX_ISA="SSE2"
emmake make -j