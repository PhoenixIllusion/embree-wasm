/* BVH Builder Callbacks */
EM_JS(void *, __RTCCreateNodeFunction, (RTCThreadLocalAllocator allocator, unsigned int childCount, void* userPtr), {
    const method = Module['__RTCCreateNodeFunction'];
    return method(allocator, childCount, userPtr);
});
EM_JS(void, __RTCSetNodeChildrenFunction, (void* nodePtr, void** children, unsigned int childCount, void* userPtr), {
    const method = Module['__RTCCreateNodeFunction'];
    method(nodePtr, children, childCount, userPtr);
});
EM_JS(void, __RTCSetNodeBoundsFunction, (void* nodePtr, const struct RTCBounds** bounds, unsigned int childCount, void* userPtr), {
    const method = Module['__RTCSetNodeBoundsFunction'];
    method(nodePtr, bounds, childCount, userPtr);
});
EM_JS(void *, __RTCCreateLeafFunction, (RTCThreadLocalAllocator allocator, const struct RTCBuildPrimitive* primitives, size_t primitiveCount, void* userPtr), {
    const method = Module['__RTCCreateLeafFunction']['constructor'];
    return method(allocator, primitives, primitiveCount, userPtr);
});
EM_JS(void, __RTCSplitPrimitiveFunction, (const struct RTCBuildPrimitive* primitive, unsigned int dimension, float position, 
            struct RTCBounds* leftBounds, struct RTCBounds* rightBounds, void* userPtr), {
    const method = Module['__RTCSplitPrimitiveFunction'];
    method(primitive, dimension, position, leftBounds, rightBounds, userPtr);
});

/* Filter callback function */
EM_JS(void, __RTCFilterFunctionN, (const struct RTCFilterFunctionNArguments* args), {
    const method = Module['__RTCFilterFunctionN'];
    return method(args);
});

EM_JS(void, __RTCIntersectFunctionN, (const struct RTCIntersectFunctionNArguments* args), {
    const method = Module['__RTCIntersectFunctionN'];
    return method(args);
});

EM_JS(void, __RTCOccludedFunctionN, (const struct RTCOccludedFunctionNArguments* args), {
    const method = Module['__RTCOccludedFunctionN'];
    return method(args);
});
