import fs from 'fs';

if(process.argv.length < 4) {
  console.error("Usage: <IDL file fragment>, <source_c_header_folder>")
  process.exit(1);
}
const [_node, _script_name, IDL_Filename, C_Header_Dir] = process.argv;

if(!fs.existsSync(IDL_Filename)) {
  console.error("Unable to find IDL Fragment", IDL_Filename);
  process.exit(1);
}
if(!fs.existsSync(C_Header_Dir)) {
  console.error("Unable to find C Header Directory", C_Header_Dir);
  process.exit(1);
}

const IDL = fs.readFileSync(IDL_Filename,'utf8');

const IDL_Regex = /(\S+)\(/g;
const IDL_Functions = [];
const Original_Header = IDL.substring(0, IDL.indexOf('\n'));
if(!Original_Header.match(/\/\/.+\.h\s*/)) {
  console.error(`First line of IDL [${IDL_Filename}] file is not //<source_header.h>, found`, Original_Header);
  process.exit(1);
}
const Original_Header_Path = C_Header_Dir+(C_Header_Dir.endsWith('/')?'':'/')+Original_Header.substring(2).trim();
if(!fs.existsSync(Original_Header_Path)) {
  console.error(`IDL [${IDL_Filename}] lists [${Original_Header.substring(2)}], but [${Original_Header_Path}] not found.`);
  process.exit(1);
}
let IDL_Requested_Methods = {};
let match;
while(match = IDL_Regex.exec(IDL)) {
  IDL_Requested_Methods[match[1]] = true;
}

const C_Functions = [];
const Original_Header_Content = fs.readFileSync(Original_Header_Path, 'utf8').replaceAll('\n',' ');
const C_Func_Regex = /RTC_(?:SYCL_)?(?:API|FORCEINLINE)\s(.+?\))/smg;

console.log(`//Source IDL: ${IDL_Filename}`);
console.log(`//Embree Header: ${Original_Header.substring(2)}`);
while(match = C_Func_Regex.exec(Original_Header_Content)) {
  const c_method = match[1];

  try {
    const method_name = /(\S+)\s*\(/.exec(c_method)[1];
  
    //we are comparing rtcNewDevice with RTC.newDevice
    const sub_name = method_name.substring(3)
    const compare_name = sub_name.substring(0,1).toLowerCase()+sub_name.substring(1);
    if(IDL_Requested_Methods[compare_name]) {
      const ret_type = /(.+?)\S+\s*\(/.exec(c_method)[1];
      const declare_params = /\((.*)\)/.exec(c_method)[1];
      const params = declare_params? declare_params.split(','): [];
      const varNames = params.map(s => /\s(\S+)$/.exec(s.replace('RTC_OPTIONAL_ARGUMENT','').trim())[0].trim());
      console.log(`
  static ${ret_type}${compare_name}(${declare_params}) {
    return ${method_name}(${varNames.join(', ')});
  }`);
    }
    delete IDL_Requested_Methods[compare_name];
  } catch(ex) {
    console.error(`Error parsing [${Original_Header_Path}] - ${c_method}`);
    console.error(ex);
    process.exit(1);
  }
}
const missing_functions = Object.keys(IDL_Requested_Methods);
if(missing_functions.length > 0) {
  console.error(`Error: Did not find following functions [${IDL_Filename}] [${Original_Header_Path}]: `, missing_functions);
}
