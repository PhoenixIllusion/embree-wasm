// Embree Extras
  type ArrayBufferConstructor = {new : (...args: any) => ArrayBufferView }
  function wrapTypedArray<C extends ArrayBufferConstructor>(ptr: number, len: number, Class: C): ArrayBufferView;
  function allocTypedArray<C extends ArrayBufferConstructor>(size: number, Class: C): ArrayBufferView;
