
    /// Get the total reserved memory in bytes
    /// See: https://github.com/emscripten-core/emscripten/blob/7459cab167138419168b5ac5eacf74702d5a3dae/test/core/test_mallinfo.c#L16-L18
    static size_t	getTotalMemory()
    {
      return (size_t)EM_ASM_PTR(return HEAP8.length);
    }

    /// Get the amount of free memory in bytes
    /// See: https://github.com/emscripten-core/emscripten/blob/7459cab167138419168b5ac5eacf74702d5a3dae/test/core/test_mallinfo.c#L20-L25
    static size_t	getFreeMemory()
    {
      struct mallinfo i = mallinfo();
      uintptr_t total_memory = getTotalMemory();
      uintptr_t dynamic_top = (uintptr_t)sbrk(0);
      return total_memory - dynamic_top + i.fordblks;
    }

    static size_t sizeOfRTCRayHit() {
      return sizeof(RTCRayHit);
    }
    static size_t sizeOfRTCRayHit4() {
      return sizeof(RTCRayHit4);
    }
    static size_t sizeOfRTCRayHit8() {
      return sizeof(RTCRayHit8);
    }
    static size_t sizeOfRTCRayHit16() {
      return sizeof(RTCRayHit16);
    }

    static size_t sizeOfRTCRay() {
      return sizeof(RTCRay);
    }
    static size_t sizeOfRTCRay4() {
      return sizeof(RTCRay4);
    }
    static size_t sizeOfRTCRay8() {
      return sizeof(RTCRay8);
    }
    static size_t sizeOfRTCRay16() {
      return sizeof(RTCRay16);
    }

    // Function Pointer Accessors - Note: All Shared. Use UserData to distinguish if needing more than one
    static  RTCCreateNodeFunction getRTCCreateNodeFunction() {
        return &__RTCCreateNodeFunction;
    }
    static RTCSetNodeChildrenFunction getRTCSetNodeChildrenFunction() {
        return &__RTCSetNodeChildrenFunction;
    }
    static RTCSetNodeBoundsFunction getRTCSetNodeBoundsFunction() {
        return &__RTCSetNodeBoundsFunction;
    }
    static RTCCreateLeafFunction getRTCCreateLeafFunction() {
        return &__RTCCreateLeafFunction;
    }
    static RTCSplitPrimitiveFunction getRTCSplitPrimitiveFunction() {
        return &__RTCSplitPrimitiveFunction;
    }

    static RTCFilterFunctionN getRTCFilterFunctionN() {
        return &__RTCFilterFunctionN;
    }
    static RTCIntersectFunctionN getRTCIntersectFunctionN() {
        return &__RTCIntersectFunctionN;
    }
    static RTCOccludedFunctionN getRTCOccludedFunctionN() {
        return &__RTCOccludedFunctionN;
    }

    static void intersect1M(RTCScene scene, void * _rayhit, unsigned short M, struct RTCIntersectArguments* args RTC_OPTIONAL_ARGUMENT) {
      struct RTCRayHit** rayhit = (struct RTCRayHit**)_rayhit;
      for(int i = 0; i < M; i++) {
        rtcIntersect1(scene, rayhit[i], args);
      }
    }
    static void occluded1M(RTCScene scene, void* _ray, unsigned short M, struct RTCOccludedArguments* args RTC_OPTIONAL_ARGUMENT) {
      struct RTCRay** ray = (struct RTCRay**)_ray;
      for(int i = 0; i < M; i++) {
        rtcOccluded1(scene, ray[i], args);
      }
    }

    static void intersect4M(int* valid, RTCScene scene, void * _rayhit, unsigned short M, struct RTCIntersectArguments* args RTC_OPTIONAL_ARGUMENT) {
      struct RTCRayHit4** rayhit = (struct RTCRayHit4**)_rayhit;
      for(int i = 0; i < M; i++) {
        rtcIntersect4(valid, scene, rayhit[i], args);
      }
    }
    static void occluded4M(int* valid, RTCScene scene, void* _ray, unsigned short M, struct RTCOccludedArguments* args RTC_OPTIONAL_ARGUMENT) {
      struct RTCRay4** ray = (struct RTCRay4**)_ray;
      for(int i = 0; i < M; i++) {
        rtcOccluded4(valid, scene, ray[i], args);
      }
    }