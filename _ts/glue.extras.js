
function wrapTypedArray(ptr, len, Class) {
  const ret = new Class(Module['HEAP8'].buffer, ptr, len);
  ret.ptr = len;
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