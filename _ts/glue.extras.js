
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