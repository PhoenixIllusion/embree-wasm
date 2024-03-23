class Mesh {
  public readonly vertices: Float32Array;
  public readonly index: Uint32Array;
  constructor(str: string) {
    const vertices: number[][] = [];
    const index: number[] = [];
    str.split('\n').forEach(line => {
      if (line.startsWith('v '))
      vertices.push([... line.split(/\s+/).slice(1).map(parseFloat), 1])
      if (line.startsWith('f ')) index.push(
        ...Array.from(this.triangulate(line.split(/\s+/).slice(1))).map(tri => tri.map(v =>
          parseInt(v.split('/')[0], 10) - 1
        ).flat()).flat()
      )
    })
    this.vertices = new Float32Array(vertices.flat());
    this.index = new Uint32Array(index);
  }
  private *triangulate(elements: string[]) {
    if (elements.length <= 3) {
      yield elements;
    } else if (elements.length === 4) {
      yield [elements[0], elements[1], elements[2]];
      yield [elements[2], elements[3], elements[0]];
    } else {
      for (let i = 1; i < elements.length - 1; i++) {
        yield [elements[0], elements[i], elements[i + 1]];
      }
    }
  }
}


export async function loadModel(file: string) {
  const objStr = await fetch(file).then(res => res.text());
  var mesh = new Mesh(objStr);
  return {
    tri_count: mesh.vertices.length / 9,
    vertices: mesh.vertices,
    index: mesh.index
  }
}
