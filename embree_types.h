
using VoidArray = void *;
using FloatPtr = float;
using SceneArray = RTCScene;
using Device = RTCDeviceTy;
using Scene = RTCSceneTy;
using Geometry = RTCGeometryTy;
using Buffer = RTCBufferTy;
using ValidMask = int;

using BVH4 = embree::BVH4;
using NodeRef4 = BVH4::NodeRef;

using BaseNode4 = embree::BaseNode_t<NodeRef4,4>;

using AABBNode4 = embree::AABBNode_t<NodeRef4,4>;
using AABBNode4MB = embree::AABBNodeMB_t<NodeRef4,4>;
using OBBNode4 = embree::OBBNode_t<NodeRef4,4>;
using OBBNodeMB4 = embree::OBBNodeMB_t<NodeRef4,4>;
using QAABBNode4 = embree::QuantizedNode_t<NodeRef4,4>;

using PrimitiveType = embree::PrimitiveType;
using BBox3fa = embree::BBox3fa;
using Vec3fa = embree::Vec3fa;

using Triangle4v = embree::Triangle4v;

using vfloat4 = embree::vfloat4;
using Vec3vf4 = embree::Vec3vf4;

using AccelData = embree::AccelData;
using Accel = embree::Accel;
using AccelN = embree::AccelN;
using VectorAccel = std::vector<Accel*>;

using AccelCollider = Accel::Collider;
using AccelIntersector1 = Accel::Intersector1;
using AccelIntersector4 = Accel::Intersector4;
using AccelIntersector8 = Accel::Intersector8;
using AccelIntersector16 = Accel::Intersector16;

using AccelIntersectors = Accel::Intersectors;

using BVH = RTCBVHTy;


using AccelData_Type = AccelData::Type;
constexpr AccelData_Type ACCEL_TYP_UNKNOWN = Accel::TY_UNKNOWN;
constexpr AccelData_Type ACCEL_TY_ACCELN = Accel::TY_ACCELN;
constexpr AccelData_Type ACCEL_TY_ACCEL_INSTANCE = Accel::TY_ACCEL_INSTANCE;
constexpr AccelData_Type ACCEL_TY_BVH4 = Accel::TY_BVH4;
constexpr AccelData_Type ACCEL_TY_BVH8 = Accel::TY_BVH8;
constexpr AccelData_Type ACCEL_TY_GPU = Accel::TY_GPU;