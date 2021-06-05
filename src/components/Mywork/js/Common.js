import vertexShader from "./glsl/shape.vert"
import fragmentShader from "./glsl/shape.frag"
import {Mat4} from './minMatrix/minMatrix'

class Common {
  constructor() {
    this.c = null // canvas
    this.gl = null
    this.v_shader = null
    this.f_shader = null
    this.prg = null
    this.attLocation = new Array()
    this.position_vbo = null
    this.color_vbo = null
    this.normal_vbo = null
    this.m = null // matIV
    this.mMatrix = null
    this.vMatrix = null
    this.pMatrix = null
    this.tmpMatrix = null
    this.mvpMatrix = null
    this.uniLocation = new Array()

    this.ibo = null

    this.size = {
      windowW: null,
      windowH: null
    }

    this.attStride = new Array()

    this.vertex_position = [
      0.0, 1.0, 0.0,
      1.0, 0.0, 0.0,
     -1.0, 0.0, 0.0,
      0.0,-1.0, 0.0
    ]
    this.vertex_color = [
      1.0, 1.0, 0.0, 1.0,
      0.0, 1.0, 1.0, 1.0,
      1.0, 0.0, 1.0, 1.0,
      0.0, 0.0, 1.0, 1.0
    ]
    this.index = [
      0, 1, 2,
      1, 2, 3
    ]

    this.count = 0

    this.torusData = null
    this.position = null
    this.normal = null

    this.lightDirection = null
    this.eyeDirection = null
    this.ambientCoor = null
  }

  init($canvas) {
    this.setSize()

    this.c = $canvas
    this.c.width = this.size.windowW
    this.c.height = this.size.windowH
    this.gl = this.c.getContext('webgl') || this.c.getContext('experimental-webgl')
    if (this.gl === null) {
      alert("WebGL を初期化できません。ブラウザーまたはマシンがサポートしていない可能性があります。");
      return;
    }

    this.v_shader = this.createShader('v', this.gl)
    this.f_shader = this.createShader('f', this.gl)
    // プログラムオブジェクトの生成とリンク
    this.prg = this.createProgram(this.v_shader,this.f_shader,this.gl)

    this.attLocation[0] = this.gl.getAttribLocation(this.prg, 'position')
    this.attLocation[1] = this.gl.getAttribLocation(this.prg, 'normal')
    this.attLocation[2] = this.gl.getAttribLocation(this.prg, 'color')

    this.attStride[0] = 3
    this.attStride[1] = 3
    this.attStride[2] = 4

    // toras
    this.torusData = this.torus(3, 5, 4.0, 5.0)
    this.position  = this.torusData.p
    this.normal    = this.torusData.n
    this.color     = this.torusData.c
    this.index     = this.torusData.i

    this.position_vbo = this.createVBO(this.position, this.gl)
    this.normal_vbo   = this.createVBO(this.normal, this.gl)
    this.color_vbo    = this.createVBO(this.color, this.gl)

    // vboを登録
    this.setAttribute([this.position_vbo, this.normal_vbo, this.color_vbo], this.attLocation, this.attStride, this.gl)

    // IBOの生成
    this.ibo = this.createIBO(this.index)
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo)

    // uniformLocationの取得
    this.uniLocation[0] = this.gl.getUniformLocation(this.prg, 'mvpMatrix')
    this.uniLocation[1] = this.gl.getUniformLocation(this.prg, 'invMatrix')
    this.uniLocation[2] = this.gl.getUniformLocation(this.prg, 'lightDirection')
    this.uniLocation[3] = this.gl.getUniformLocation(this.prg, 'eyeDirection')
    this.uniLocation[4] = this.gl.getUniformLocation(this.prg, 'ambientColor')

    this.m = new Mat4()

    this.mMatrix = this.m.identity(this.m.create())
    this.vMatrix = this.m.identity(this.m.create())
    this.pMatrix = this.m.identity(this.m.create())
    this.tmpMatrix = this.m.identity(this.m.create())
    this.mvpMatrix = this.m.identity(this.m.create())
    this.invMatrix = this.m.identity(this.m.create())

    // 平行光源の向き
    this.lightDirection = [-1.0, 1.0, 1.0]
    // 視点ベクトル
    this.eyeDirection = [0.0, 1.0, 20.0]
    // 環境光の色
    this.ambientCoor = [0.1, 0.0, 0.2, 1.0]

    // ビューxプロジェクション座標変換行列
    this.m.lookAt([0.0,0.0,20.0], [0, 0, 0], [0, 1, 0], this.vMatrix)
    this.m.perspective(45, this.c.width / this.c.height, 0.1, 100, this.pMatrix)
    this.m.multiply(this.pMatrix, this.vMatrix, this.tmpMatrix)

    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
    this.gl.enable(this.gl.CULL_FACE)

    this.update()
  }

  setSize() {
    this.size = {
      windowW: window.innerWidth,
      windowH: window.innerHeight
    }
  }
  // シェーダを生成する関数
  createShader(name, gl) {
    let shader,shader_text
    switch(name) {
      case 'v':
        shader = gl.createShader(gl.VERTEX_SHADER)
        shader_text = vertexShader
        break
      case 'f':
        shader = gl.createShader(gl.FRAGMENT_SHADER)
        shader_text = fragmentShader
        break
      default:
        break
    }

    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader,shader_text)
    // コンパイル
    gl.compileShader(shader)

    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      // 成功していたらシェーダを返して終了
      return shader
    }else{
      // 失敗していたらエラーログをアラートする
      alert(gl.getShaderInfoLog(shader))
    }
  }
  // プログラムオブジェクトを生成しシェーダをリンクする関数
  createProgram(v, s, gl) {
    const program = gl.createProgram()

    gl.attachShader(program, v)
    gl.attachShader(program, s)

    gl.linkProgram(program)

    if(gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program)
      return program
    } else {
      alert(gl.getProgramIngoLog(program))
    }
  }
  // VBOを生成
  createVBO(data, gl) {
    const vbo = gl.createBuffer()

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    return vbo
  }
  // VBOをバインドし登録する関数
  setAttribute(vboArray, attL, attS, gl) {
    for(let i in vboArray) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vboArray[i])
      gl.enableVertexAttribArray(attL[i])
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0)
    }
  }

  update() {
    window.requestAnimationFrame(this.update.bind(this))
    // canvas初期化
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clearDepth(1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

    this.count++

    const rad = (this.count % 360) * Math.PI / 180
    // const x = Math.cos(rad) * 1.5
    // const z = Math.sin(rad) * 1.5

    // モデル１は円の軌道を描き移動させる
    // const x = Math.cos(rad)
    // const y = Math.sin(rad)
    // this.m.identity(this.mMatrix)
    // this.m.translate(this.mMatrix, [x, y + 1.0, 0.0], this.mMatrix)

    // モデル１の座標変換行列を完成させレンダリングする
    // this.m.multiply(this.tmpMatrix, this.mMatrix,this.mvpMatrix)
    // this.gl.uniformMatrix4fv(this.uniLocation, false, this.mvpMatrix)
    // this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)

    // model2はy軸を中心に回転する
    // this.m.identity(this.mMatrix)
    // this.m.translate(this.mMatrix, [1.0, -1.0, 0.0], this.mMatrix)
    // this.m.rotate(this.mMatrix, rad, [0, 1, 0], this.mMatrix)

    // model2座標変換行列を完成させレンダリング
    // this.m.multiply(this.tmpMatrix, this.mMatrix, this.mvpMatrix)
    // this.gl.uniformMatrix4fv(this.uniLocation, false, this.mvpMatrix)
    // this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)

    // model3は拡大縮小する
    // const s = Math.sin(rad) + 1.0
    // this.m.identity(this.mMatrix)
    // this.m.translate(this.mMatrix, [-1.0, -1.0, 0.0], this.mMatrix)
    // this.m.scale(this.mMatrix, [s, s, 0.0], this.mMatrix)

    // model3の座標変換を完成させレンダリング
    // this.m.multiply(this.tmpMatrix, this.mMatrix, this.mvpMatrix)
    // this.gl.uniformMatrix4fv(this.uniLocation, false, this.mvpMatrix)
    // this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)

    // 18 19 20
    // this.m.identity(this.mMatrix)
    // this.m.translate(this.mMatrix, [x, 0.0, z], this.mMatrix)
    // this.m.rotate(this.mMatrix, rad, [1, 0, 0], this.mMatrix)
    // this.m.multiply(this.tmpMatrix, this.mMatrix, this.mvpMatrix)
    // this.gl.uniformMatrix4fv(this.uniLocation, false, this.mvpMatrix)
    // this.gl.drawElements(this.gl.TRIANGLES, this.index.length, this.gl.UNSIGNED_SHORT, 0)


    // this.m.identity(this.mMatrix)
    // this.m.translate(this.mMatrix, [-x, 0.0, -z], this.mMatrix)
    // this.m.rotate(this.mMatrix, rad, [0, 1, 0], this.mMatrix)
    // this.m.multiply(this.tmpMatrix, this.mMatrix, this.mvpMatrix)
    // this.gl.uniformMatrix4fv(this.uniLocation, false, this.mvpMatrix)
    // this.gl.drawElements(this.gl.TRIANGLES, this.index.length, this.gl.UNSIGNED_SHORT, 0)

    this.m.identity(this.mMatrix)
    this.m.rotate(this.mMatrix, rad, [0, 1, 1], this.mMatrix)
    this.m.multiply(this.tmpMatrix, this.mMatrix, this.mvpMatrix)

    this.m.inverse(this.mMatrix, this.invMatrix)

    this.gl.uniformMatrix4fv(this.uniLocation[0], false, this.mvpMatrix)
    this.gl.uniformMatrix4fv(this.uniLocation[1], false, this.invMatrix)
    this.gl.uniform3fv(this.uniLocation[2], this.lightDirection)
    this.gl.uniform3fv(this.uniLocation[3], this.eyeDirection)
    this.gl.uniform4fv(this.uniLocation[4], this.ambientCoor)

    this.gl.drawElements(this.gl.TRIANGLES, this.index.length, this.gl.UNSIGNED_SHORT, 0)

    // コンテキストの再描画
    this.gl.flush()
  }

  createIBO(data) {
    const _ibo = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, _ibo)
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), this.gl.STATIC_DRAW)
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
    return _ibo
  }

  /**
   * トーラスモデル作成
   * @param {*} row パイプを形成する円をいくつの頂点で表現するのかを指定（大きい円・カクカク度
   * @param {*} column パイプをどれくらい分割するのかを指定
   * @param {*} irad 生成されるパイプそのものの半径
   * @param {*} orad 原点からパイプの中心までの距離（大きい円の半径
   * @param {*} color
   */
  torus(row, column, irad, orad, color) {
    let pos = new Array(),
        nor = new Array(),
        col = new Array(),
        idx = new Array()

    for(let i=0; i <= row; i++) {
      let r = Math.PI * 2 / row * i
      let rr = Math.cos(r)
      let ry = Math.sin(r)

      for(let ii=0; ii <= column; ii++) {
        let tr = Math.PI * 2 / column * ii
        let tx = (rr * irad + orad) * Math.cos(tr)
        let ty = ry * irad
        let tz = (rr * irad + orad) * Math.sin(tr)
        let rx = rr * Math.cos(tr)
        let rz = rr * Math.sin(tr)
        let tc = this.hsva(360 / column * ii, 1, 1, 1)
        if(color) tc = color
        pos.push(tx, ty, tz)
        nor.push(rx, ry, rz)
        col.push(tc[0], tc[1], tc[2], tc[3])
      }

    }

    for(let j=0; j<row; j++) {
      for(let jj=0; jj<column; jj++) {
        let r = (column + 1) * j + jj
        idx.push(r, r + column + 1, r + 1)
        idx.push(r + column + 1, r + column + 2, r + 1)
      }
    }

    return {p: pos, n: nor, c: col, i: idx}
  }

  hsva(h, s, v, a) {
    if(s > 1 || v > 1 || a > 1) return
    let th = h % 360
    let i = Math.floor(th / 60)
    let f = th / 60 - i
    let m = v * (1 - s)
    let n = v * (1 - s * f)
    let k = v * (1 - s * (1 - f))
    let color = new Array()

    if(!s > 0 && !s < 0) {
      color.push(v, v, v, a)
    } else {
      let r = new Array(v, n, m, m, k, v)
      let g = new Array(k, v, v, n, m, m)
      let b = new Array(m, m, k, v, v, n)
      color.push(r[i], g[i], b[i], a)
    }

    return color
  }

}

export default new Common()