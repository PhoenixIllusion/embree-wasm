
class RTCBuildPrimitiveArray {
  RTCBuildPrimitive *data;
  public:
    RTCBuildPrimitiveArray(unsigned long size) {
      data = (RTCBuildPrimitive *)memalign(32, size * sizeof(RTCBuildPrimitive));
    }
    ~RTCBuildPrimitiveArray() {
      free(data);
    }
    RTCBuildPrimitive* get(long i) {
      return &(data[i]);
    }
    void set(long i, const RTCBuildPrimitive *value) {
      data[i] = *value;
    }
    RTCBuildPrimitive* ptr() {
      return data;
    }
};



extern "C" {
EMSCRIPTEN_KEEPALIVE
    void tileIntersect1Z(const AffineSpace3fa *xfm, RTCScene scene, struct RTCRayHit* rayhit, struct RTCIntersectArguments* args,
      int d_x, int d_width, int d_y, int d_height,
      float * dest) {
        RTCRayHit cached = *rayhit;
        LinearSpace3fa ll = xfm->l;
        Vec3fa dZ = ll.vz;

        size_t idx = 0;
        for (int y = d_y; y < d_y+d_height; y++) {
          Vec3fa dY = dZ + ll.vy * (float)y;

          for (int x = d_x; x < d_x+d_width; x++) {
            Vec3fa dir = normalize(dY + ll.vx * (float)x);

            rayhit->ray.dir_x = dir.x;
            rayhit->ray.dir_y = dir.y;
            rayhit->ray.dir_z = dir.z;

            rtcIntersect1(scene, rayhit, args);

            dest[idx++] = rayhit->ray.tfar;
            *rayhit = cached;
          }
        }
    }

EMSCRIPTEN_KEEPALIVE
    void tileIntersect4Z(const AffineSpace3fa *xfm, RTCScene scene, struct RTCRayHit4* rayhit, struct RTCIntersectArguments* args,
      int d_x, int d_width, int d_y, int d_height,
      float * dest) {
        const int LEN=4;
        const int valid[LEN] = { -1, -1, -1, -1};
        RTCRayHit4 cached = *rayhit;

        LinearSpace3fa ll = xfm->l;
        Vec3fa dZ = ll.vz;

        size_t idx = 0;
        for (int y = d_y; y < d_y+d_height; y++) {
          Vec3fa dY = dZ + ll.vy * (float)y;

          for (int x = d_x; x < d_x+d_width; x+=LEN) {

             for(int i=0;i<LEN;i++) {
              Vec3fa dir = normalize(dY + ll.vx * (float)(x+i));
              rayhit->ray.dir_x[i] = dir.x;
              rayhit->ray.dir_y[i] = dir.y;
              rayhit->ray.dir_z[i] = dir.z;
             }

            rtcIntersect4(valid, scene, rayhit, args);
            for(int i=0;i<LEN;i++)
              dest[idx++] = rayhit->ray.tfar[i];
            *rayhit = cached;
          }
        }
    }

EMSCRIPTEN_KEEPALIVE
    void tileIntersect8Z(const AffineSpace3fa *xfm, RTCScene scene, struct RTCRayHit8* rayhit, struct RTCIntersectArguments* args,
      int d_x, int d_width, int d_y, int d_height,
      float * dest) {
        const int LEN=8;
        const int valid[LEN] = { -1, -1, -1, -1, -1, -1, -1, -1};
        RTCRayHit8 cached = *rayhit;

        LinearSpace3fa ll = xfm->l;
        Vec3fa dZ = ll.vz;

        size_t idx = 0;
        for (int y = d_y; y < d_y+d_height; y++) {
          Vec3fa dY = dZ + ll.vy * (float)y;

          for (int x = d_x; x < d_x+d_width; x+=LEN) {

             for(int i=0;i<LEN;i++) {
              Vec3fa dir = normalize(dY + ll.vx * (float)(x+i));
              rayhit->ray.dir_x[i] = dir.x;
              rayhit->ray.dir_y[i] = dir.y;
              rayhit->ray.dir_z[i] = dir.z;
             }

            rtcIntersect8(valid, scene, rayhit, args);
            for(int i=0;i<LEN;i++)
              dest[idx++] = rayhit->ray.tfar[i];
            *rayhit = cached;
          }
        }
    }

EMSCRIPTEN_KEEPALIVE
    void tileIntersect16Z(const AffineSpace3fa *xfm, RTCScene scene, struct RTCRayHit16* rayhit, struct RTCIntersectArguments* args,
      int d_x, int d_width, int d_y, int d_height,
      float * dest) {
        const int LEN=16;
        const int valid[LEN] = { -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1};
        RTCRayHit16 cached = *rayhit;

        LinearSpace3fa ll = xfm->l;
        Vec3fa dZ = ll.vz;

        size_t idx = 0;
        for (int y = d_y; y < d_y+d_height; y++) {
          Vec3fa dY = dZ + ll.vy * (float)y;

          for (int x = d_x; x < d_x+d_width; x+=LEN) {

             for(int i=0;i<LEN;i++) {
              Vec3fa dir = normalize(dY + ll.vx * (float)(x+i));
              rayhit->ray.dir_x[i] = dir.x;
              rayhit->ray.dir_y[i] = dir.y;
              rayhit->ray.dir_z[i] = dir.z;
             }

            rtcIntersect16(valid, scene, rayhit, args);
            for(int i=0;i<LEN;i++)
              dest[idx++] = rayhit->ray.tfar[i];
            *rayhit = cached;
          }
        }
    }
}

#ifdef __EMSCRIPTEN_WASM_WORKERS__
#include <emscripten/wasm_worker.h>

struct RenderThread {
  size_t stackSize;
  void * threadStack;
  emscripten_wasm_worker_t worker;

  int numThreads;
  int id;
  emscripten_semaphore_t WORK_AVAILABLE;
  emscripten_semaphore_t *DONE;

  bool terminate;
  void (*renderThread)(struct RenderThread*);
  AffineSpace3fa *xfm;
  RTCScene scene;
  int width;
  int height;
  float * dest;

  int * valid;
  RTCRayHit16 *rayhit;
};

struct RenderThreadPool {
  int numThreads;
  struct RenderThread * threads;
  emscripten_semaphore_t THREADS_DONE;
  void * data;
};

extern "C" {

  void start_worker(int ptr) {
    RenderThread * thread = (RenderThread*)ptr;
    emscripten_semaphore_t *WORK_AVAILABLE = &(thread->WORK_AVAILABLE);
    emscripten_lock_t *DONE = thread->DONE;
    while(true) {
      emscripten_semaphore_waitinf_acquire(WORK_AVAILABLE, 1);
      if(thread->terminate) return;
      thread->renderThread(thread);
      emscripten_semaphore_release(DONE, 1);
    }
  }

  EMSCRIPTEN_KEEPALIVE
    RenderThreadPool * initRenderThreadPool(int numThreads, size_t stackSize) {
      struct RenderThreadPool * pool = (struct RenderThreadPool*)malloc(sizeof(RenderThreadPool));
      pool->threads = (RenderThread*)malloc(numThreads * sizeof(RenderThread));
      pool->numThreads = numThreads;
      pool->THREADS_DONE = 0;
      
      for(int i=0; i < numThreads; i++) {
        struct RenderThread *thread = &(pool->threads[i]);
        thread->stackSize = stackSize;
        thread->threadStack = memalign(64, stackSize);
        thread->worker = emscripten_create_wasm_worker(pool->threads[i].threadStack, stackSize);

        thread->numThreads = numThreads;
        thread->id = i;
        thread->WORK_AVAILABLE = 0;
        thread->DONE = &(pool->THREADS_DONE);
        thread->terminate = false;
        emscripten_wasm_worker_post_function_vi(thread->worker, start_worker, (int)thread);
      }

      return pool;
    }

  EMSCRIPTEN_KEEPALIVE
    void releaseRenderThreadPool(RenderThreadPool * pool) {
      for(int i=0; i < pool->numThreads; i++) {
        pool->threads[i].terminate = true;
        emscripten_semaphore_release(&(pool->threads[i].WORK_AVAILABLE), 1);
      }
    }

    void sharedTileIntersect16Z(struct RenderThread* thread) {
        const int LEN=16;
        int * valid = thread->valid;

        int threadId = thread->id;
        int numThreads = thread->numThreads;
        int width = thread->width;
        int height = thread->height;
        AffineSpace3fa *xfm = thread->xfm;
        RTCScene scene = thread->scene;
        float * dest = thread->dest;


        Vec3fa eye = xfm->p;
        RTCRayHit16 cached;
        for(int i=0;i<16;i++) {
          cached.ray.org_x[i] = eye.x;
          cached.ray.org_y[i] = eye.y;
          cached.ray.org_z[i] = eye.z;

          cached.ray.tnear[i] = 0;
          cached.ray.tfar[i] = 1e30;
          cached.ray.flags[i] = 0;
          cached.ray.mask[i] = -1;

          cached.hit.geomID[i] = -1;
          cached.hit.primID[i] = -1;
          valid[i] = -1;
        }

        RTCRayHit16 *rayhit = thread->rayhit;
        *rayhit = cached;

        RTCIntersectArguments intersectArguments;
        rtcInitIntersectArguments(&intersectArguments);
        intersectArguments.flags = RTC_RAY_QUERY_FLAG_COHERENT;

        LinearSpace3fa ll = xfm->l;
        Vec3fa dZ = ll.vz;

        size_t idx = 0;
        for (int y = threadId; y < height; y+=numThreads) {
          Vec3fa dY = dZ + ll.vy * (float)y;
          idx = y * width;
          for (int x = 0; x < width; x+=LEN) {

             for(int i=0;i<LEN;i++) {
              Vec3fa dir = normalize(dY + ll.vx * (float)(x+i));
              rayhit->ray.dir_x[i] = dir.x;
              rayhit->ray.dir_y[i] = dir.y;
              rayhit->ray.dir_z[i] = dir.z;
             }

            rtcIntersect16(valid, scene, rayhit, &intersectArguments);
            for(int i=0;i<LEN;i++)
              dest[idx++] = rayhit->ray.tfar[i];
            *rayhit = cached;
          }
        }
    }

  EMSCRIPTEN_KEEPALIVE
    emscripten_semaphore_t * renderThreadPoolIntersect16Z(RenderThreadPool * pool, AffineSpace3fa *xfm, RTCScene scene, int width, int height,
      float * dest) {
      pool->THREADS_DONE = 0;
      for(int i=0; i < pool->numThreads; i++) {
        struct RenderThread *thread = &(pool->threads[i]);
        thread->width = width;
        thread->height = height;
        thread->xfm = xfm;
        thread->scene = scene;
        thread->dest = dest;
        thread->renderThread = &sharedTileIntersect16Z;
        thread->valid = (int*)memalign(64, 16*sizeof(int));
        thread->rayhit = (RTCRayHit16*)memalign(64, sizeof(RTCRayHit16));

        emscripten_semaphore_release(&(thread->WORK_AVAILABLE), 1);
      }
      return &(pool->THREADS_DONE);
    }
}

#endif