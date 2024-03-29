#define TASKING_INTERNAL 1
#include <emscripten.h>
#include <emscripten/bind.h>
#include <embree4/rtcore.h>
#include <sys/vector.h>
#include <math/vec2.h>
#include <math/vec3.h>
#include <math/vec4.h>
#include <math/bbox.h>
#include <math/lbbox.h>
#include <math/affinespace.h>
#include <math/bbox.h>
#include <malloc.h>
#include <string.h>
#include <unistd.h>
RTC_NAMESPACE_USE
#include <bvh/bvh.h>
#include <geometry/trianglev.h>

#include "embree_types.h"

using namespace emscripten;

#include "_h/classes.h"
#include "_h/function_ptrs.h"

RTC_NAMESPACE_USE

class RTC {
  public:
    #include "_h/extra.h"
    #include "gen.h"
};
