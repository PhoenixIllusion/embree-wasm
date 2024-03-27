import Embree from "../../em/embree";

const embree = await Embree();
const RTC = (embree.RTC.prototype as typeof Embree.RTC);

export { embree, Embree, RTC };