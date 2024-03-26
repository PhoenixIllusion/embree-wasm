
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


    static void tileIntersect1(float cam_x, float cam_y, float cam_z, RTCScene scene, struct RTCRayHit* rayhit,
      float width, float height,
      float p0_x, float p0_y, float p0_z,
      float d10_x, float d10_y, float d10_z,
      float d20_x, float d20_y, float d20_z,
      
      int d_x, int d_width, int d_y, int d_height,
      
      void * _dest, int rayhit_offset, int rayhit_len) {

        unsigned char *src = (unsigned char*)rayhit; 
        unsigned char *dest = (unsigned char*)_dest; 
        RTCRayHit cached = *rayhit;

        int Y_STRIDE = width * rayhit_len;
        int X_STRIDE = rayhit_len;

        p0_x -= cam_x;
        p0_y -= cam_y;
        p0_z -= cam_z;

        for (int y = d_y; y < d_y+d_height; y++) {
          float dY = y/height;
          float dY_x = p0_x + d20_x * dY;
          float dY_y = p0_y + d20_y * dY;
          float dY_z = p0_z + d20_z * dY;

          for (int x = d_x; x < d_x+d_width; x++) {
            float dX = x/width;

             *rayhit = cached;
            float dir_x = dY_x + d10_x * dX;
            float dir_y = dY_y + d10_y * dX;
            float dir_z = dY_z + d10_z * dX;
            float len = sqrt(dir_x * dir_x + dir_y * dir_y + dir_z * dir_z);
            rayhit->ray.dir_x = dir_x/len;
            rayhit->ray.dir_y = dir_y/len;
            rayhit->ray.dir_z = dir_z/len;

            rtcIntersect1(scene, rayhit);

            if(rayhit->ray.tfar < 1e10) {
              memcpy( dest + (x * X_STRIDE + y * Y_STRIDE), src + rayhit_offset, rayhit_len);
            }
          }
        }
    }
    static void tileIntersect4(float cam_x, float cam_y, float cam_z, RTCScene scene, struct RTCRayHit4* rayhit,
      float width, float height,
      float p0_x, float p0_y, float p0_z,
      float d10_x, float d10_y, float d10_z,
      float d20_x, float d20_y, float d20_z,
      
      int d_x, int d_width, int d_y, int d_height,
      
      void * _dest, int rayhit_offset, int rayhit_len, int *valid) {

        unsigned char *src = (unsigned char*)rayhit; 
        unsigned char *dest = (unsigned char*)_dest; 
        RTCRayHit4 cached = *rayhit;

        int Y_STRIDE = width * rayhit_len;
        int X_STRIDE = rayhit_len;

        p0_x -= cam_x;
        p0_y -= cam_y;
        p0_z -= cam_z;

        for (int y = d_y; y < d_y+d_height; y++) {
          float dY = y/height;
          float dY_x = p0_x + d20_x * dY;
          float dY_y = p0_y + d20_y * dY;
          float dY_z = p0_z + d20_z * dY;

          for (int x = d_x; x < d_x+d_width; x+=4) {

             *rayhit = cached;
             for(int i=0;i<4;i++) {
              float dX = (x+i)/width;
              float dir_x = dY_x + d10_x * dX;
              float dir_y = dY_y + d10_y * dX;
              float dir_z = dY_z + d10_z * dX;
              float len = sqrt(dir_x * dir_x + dir_y * dir_y + dir_z * dir_z);
              rayhit->ray.dir_x[i] = dir_x/len;
              rayhit->ray.dir_y[i] = dir_y/len;
              rayhit->ray.dir_z[i] = dir_z/len;
             }

            rtcIntersect4(valid, scene, rayhit);
            memcpy( dest + (x * X_STRIDE + y * Y_STRIDE), src + rayhit_offset*4, rayhit_len*4);
          }
        }
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