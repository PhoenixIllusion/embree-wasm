export class PerfLogger {
  
  private _log: [string, number][] = [];
  constructor(public name: string){}

  log<T>(name: string, cb: ()=>T):T {
    const start_time = performance.now();
    const ret = cb();
    if(ret instanceof Promise) {
      ret.then(() => 
        this._log.push([name, performance.now() - start_time])
      );
    }
    return ret;
  }
  logManual(name: string, start_time: number) {
    this._log.push([name, performance.now() - start_time]);
  }

  asHtmlTable(): string {
    const out: string[] = [];
    out.push(
      '<table>',
      `<tr><th colspan="2">${this.name}</th></tr>`
    );
    out.push(... this._log.map(([event,time])=>
      `<tr><td>${event}</td><td>${time}</td></tr>`
    ));
    out.push('</table>')
    return out.join('\n');
  }

  logToElementAsTable( outID: string) {
    const ele = document?.getElementById(outID);
    if(ele) {
      ele.innerHTML = this.asHtmlTable();
    }
  }

}