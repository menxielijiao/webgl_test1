module.exports = {
  outputDir: 'docs',
  assetsDir: './',
  publicPath: './',
  chainWebpack: (config) => {
    config.module
      .rule("text")
      .test(/\.(glsl|vs|fs|vert|frag)$/)
      .use("raw-loader")
      .loader("raw-loader")
      .end();
  },
}