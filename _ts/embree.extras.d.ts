// Embree Extras
  type TypedArrayConstructor = 
    Int8ArrayConstructor|Uint8ArrayConstructor| Uint8ClampedArrayConstructor|
    Int16ArrayConstructor|Uint16ArrayConstructor|
    Int32ArrayConstructor|Uint32ArrayConstructor|
    BigInt64Array|BigUint64Array|
    Float32ArrayConstructor|Float64ArrayConstructor|
    DataViewConstructor;
  function wrapTypedArray<C extends TypedArrayConstructor & {prototype: ArrayBufferLike}, P extends C['prototype']>(ptr: number, len: number, Class: C): P;
  function allocTypedArray<C extends TypedArrayConstructor & {prototype: ArrayBufferLike}, P extends C['prototype']>(size: number, Class: C): P;
