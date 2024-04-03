
function wrapTypedArray(ptr, len, Class) {
  const ret = new Class(Module['HEAP8'].buffer, ptr, len);
  ret.ptr = ptr;
  return ret;
}
function allocTypedArray(len, Class) {
  const byteSize = len * Class.BYTES_PER_ELEMENT;
  const ptr = Module['_malloc'](byteSize);
  return wrapTypedArray(ptr, len, Class);
}
function copyTypedArray(array, Class) {
  const ret = allocTypedArray(array.length, Class);
  ret.set(array);
  return ret;
}
function allocAlignedTypedArray(len, align, Class) {
  const byteSize = len * Class.BYTES_PER_ELEMENT;
  const ptr = Module['_memalign'](align, byteSize);
  return wrapTypedArray(ptr, len, Class);
}
function copyAlignedTypedArray(array, align, Class) {
  const ret = allocAlignedTypedArray(array.length, align, Class);
  ret.set(array);
  return ret;
}
Module['wrapTypedArray'] = wrapTypedArray;
Module['allocTypedArray'] = allocTypedArray;
Module['copyTypedArray'] = copyTypedArray;
Module['allocAlignedTypedArray'] = allocAlignedTypedArray;
Module['copyAlignedTypedArray'] = copyAlignedTypedArray;


function allocRTCRayHit() {
  const ptr = Module['_memalign'](16, RTC.prototype.sizeOfRTCRayHit());
  return wrapPointer(ptr, RTCRayHit)
};
function allocRTCRayHit4() {
  const ptr = Module['_memalign'](16, RTC.prototype.sizeOfRTCRayHit4());
  return wrapPointer(ptr, RTCRayHit4)
};
function allocRTCRayHit8() {
  const ptr = Module['_memalign'](32, RTC.prototype.sizeOfRTCRayHit8());
  return wrapPointer(ptr, RTCRayHit8)
};
function allocRTCRayHit16() {
  const ptr = Module['_memalign'](64, RTC.prototype.sizeOfRTCRayHit16());
  return wrapPointer(ptr, RTCRayHit16)
};

Module['allocRTCRayHit'] = allocRTCRayHit;
Module['allocRTCRayHit4'] = allocRTCRayHit4;
Module['allocRTCRayHit8'] = allocRTCRayHit8;
Module['allocRTCRayHit16'] = allocRTCRayHit16;

Module['tileIntersect1Z'] = function(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest) {
  if (xfm && typeof xfm === 'object') xfm = xfm.ptr;
  if (scene && typeof scene === 'object') scene = scene.ptr;
  if (rayhit && typeof rayhit === 'object') rayhit = rayhit.ptr;
  if (dest && typeof dest === 'object') dest = dest.ptr;
  if(!dest){
    throw new Error(`Error: Attempted to write to undefined dest on tileIntersect1Z`);
  }
  _tileIntersect1Z(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest);
};;
Module['tileIntersect4Z'] = function(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest) {
  if (xfm && typeof xfm === 'object') xfm = xfm.ptr;
  if (scene && typeof scene === 'object') scene = scene.ptr;
  if (rayhit && typeof rayhit === 'object') rayhit = rayhit.ptr;
  if (dest && typeof dest === 'object') dest = dest.ptr;
  if(!dest){
    throw new Error(`Error: Attempted to write to undefined dest on tileIntersect4Z`);
  }
  _tileIntersect4Z(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest);
};;
Module['tileIntersect8Z'] = function(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest) {
  if (xfm && typeof xfm === 'object') xfm = xfm.ptr;
  if (scene && typeof scene === 'object') scene = scene.ptr;
  if (rayhit && typeof rayhit === 'object') rayhit = rayhit.ptr;
  if (dest && typeof dest === 'object') dest = dest.ptr;
  if(!dest){
    throw new Error(`Error: Attempted to write to undefined dest on tileIntersect8Z`);
  }
  _tileIntersect8Z(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest);
};;
Module['tileIntersect16Z'] = function(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest) {
  if (xfm && typeof xfm === 'object') xfm = xfm.ptr;
  if (scene && typeof scene === 'object') scene = scene.ptr;
  if (rayhit && typeof rayhit === 'object') rayhit = rayhit.ptr;
  if (dest && typeof dest === 'object') dest = dest.ptr;
  if(!dest){
    throw new Error(`Error: Attempted to write to undefined dest on tileIntersect16Z`);
  }
  _tileIntersect16Z(xfm, scene, rayhit, args, d_x, d_width, d_y, d_height, dest);
};;

// RenderThreadPool
/** @suppress {undefinedVars, duplicate} @this{Object} */function RenderThreadPool() { throw "cannot construct a RenderThreadPool, no constructor" }
RenderThreadPool.prototype = Object.create(WrapperObject.prototype);
RenderThreadPool.prototype.constructor = RenderThreadPool;
RenderThreadPool.prototype.__class__ = RenderThreadPool;
RenderThreadPool.__cache__ = {};
Module['RenderThreadPool'] = RenderThreadPool;

Module['initRenderThreadPool'] = function(numThreads, stackSize) {
  const ptr = _initRenderThreadPool(numThreads, stackSize);
  return wrapPointer(ptr, RenderThreadPool);
}
Module['renderThreadPoolIntersect16Z'] = function(pool, xfm, scene, width, height, dest) {
  if (pool && typeof pool === 'object') pool = pool.ptr;
  if (xfm && typeof xfm === 'object') xfm = xfm.ptr;
  if (scene && typeof scene === 'object') scene = scene.ptr;
  if (dest && typeof dest === 'object') dest = dest.ptr;
  if(!dest){
    throw new Error(`Error: Attempted to write to undefined dest on renderThreadPoolIntersect16Z`);
  }
  return _renderThreadPoolIntersect16Z(pool, xfm, scene, width, height, dest);
}
Module['releaseRenderThreadPool'] = function(pool) {
  if (pool && typeof pool === 'object') pool = pool.ptr;
  _releaseRenderThreadPool(pool);
}
Module['wasmWorkerRunPostMessage'] = _wasmWorkerRunPostMessage;