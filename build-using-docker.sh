#!/bin/bash
set -e

docker run \
  --rm -it \
  --name emscripten-3.1.56 \
  --mount type=bind,source="$(pwd)",target=/src/ \
  -w /src/ \
  emscripten/emsdk:3.1.56 \
  /bin/bash build-using-local.sh
