#include <emscripten.h>
#include <emscripten/bind.h>
#include <embree4/rtcore.h>
#include <malloc.h>
#include <string.h>
#include <unistd.h>

using VoidArray = void *;
using Device = RTCDeviceTy;
using Scene = RTCSceneTy;
using Geometry = RTCGeometryTy;
using Buffer = RTCBufferTy;
using ValidMask = int;
using BVH = RTCBVHTy;

using namespace emscripten;

#include "_h/classes.h"
#include "_h/function_ptrs.h"

RTC_NAMESPACE_USE

class RTC {
  public:
    #include "_h/extra.h"
    #include "build/gen.h"
};
