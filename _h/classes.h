
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