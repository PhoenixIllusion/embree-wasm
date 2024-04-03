import Embree from "../../em/embree";

const embree = await Embree({
  locateFile: function(path: string, scriptDirectory: string) {
    if(path == 'embree.ww.js') {
      return '/embree.ww.js'
    } else {
      return scriptDirectory + '/'+ path;
    }
  }
});
const RTC = (embree.RTC.prototype as unknown as Embree.RTC);

export { embree, Embree, RTC };