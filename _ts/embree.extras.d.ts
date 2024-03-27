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
  function copyTypedArray<C extends TypedArrayConstructor & {prototype: ArrayBufferLike}, P extends C['prototype']>(arr: ArrayLike<number>, Class: C): P;
  function allocAlignedTypedArray<C extends TypedArrayConstructor & {prototype: ArrayBufferLike}, P extends C['prototype']>(size: number, align: number, Class: C): P;
  function copyAlignedTypedArray<C extends TypedArrayConstructor & {prototype: ArrayBufferLike}, P extends C['prototype']>(arr: ArrayLike<number>, align: number, Class: C): P;
  
  function _memalign(alignment: number, bytes: number): number;

  function allocRTCRayHit(): Embree.RTCRayHit;
  function allocRTCRayHit4(): Embree.RTCRayHit4;
  function allocRTCRayHit8(): Embree.RTCRayHit8;
  function allocRTCRayHit16(): Embree.RTCRayHit16;

