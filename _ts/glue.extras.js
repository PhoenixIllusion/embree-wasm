
function wrapTypedArray(ptr, len, Class) {
  const ret = new Class(Module['HEAP8'].buffer, ptr, len);
  ret.ptr = len;
  return ret;
}
Module['wrapTypedArray'] = wrapTypedArray;

function allocTypedArray(len, Class) {
  const byteSize = len * Class.BYTES_PER_ELEMENT;
  const ptr = Module['_malloc'](byteSize);
  return wrapTypedArray(ptr, len, Class);
}
Module['allocTypedArray'] = allocTypedArray;


function copyTypedArray(array, Class) {
  const ret = allocTypedArray(array.length, Class);
  ret.set(array);
  return ret;
}
Module['copyTypedArray'] = copyTypedArray;


function allocAlignedTypedArray(len, align, Class) {
  const byteSize = len * Class.BYTES_PER_ELEMENT;
  const ptr = Module['_memalign'](align, byteSize);
  return wrapTypedArray(ptr, len, Class);
}
Module['allocAlignedTypedArray'] = allocAlignedTypedArray;

function copyAlignedTypedArray(array, align, Class) {
  const ret = allocAlignedTypedArray(array.length, align, Class);
  ret.set(array);
  return ret;
}
Module['copyAlignedTypedArray'] = copyAlignedTypedArray;