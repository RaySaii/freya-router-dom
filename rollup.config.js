const babel = require('rollup-plugin-babel')
const replace = require('rollup-plugin-replace')
const { sizeSnapshot } = require('rollup-plugin-size-snapshot')
const { uglify } = require('rollup-plugin-uglify')
const path = require('path')
const pkg = require('./package.json')
const localResolve = require('rollup-plugin-local-resolve')


function isBareModuleId(id) {
  return (
      !id.startsWith('.') && !id.includes(path.join(process.cwd(), 'modules'))
  )
}

const cjs = [
  {
    input: 'modules/index.js',
    output: { file: `cjs/${pkg.name}.js`, format: 'cjs', esModule: false },
    external: isBareModuleId,
    plugins: [
      localResolve(),
      babel({ exclude: /node_modules/}),
      replace({ 'process.env.NODE_ENV': JSON.stringify('development') }),
    ],
  },
  {
    input: 'modules/index.js',
    output: { file: `cjs/${pkg.name}.min.js`, format: 'cjs' },
    external: isBareModuleId,
    plugins: [
      localResolve(),
      babel({ exclude: /node_modules/ }),
      replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
      uglify(),
    ],
  },
]

const esm = [
  {
    input: 'modules/index.js',
    output: { file: `esm/${pkg.name}.js`, format: 'esm' },
    external: isBareModuleId,
    plugins: [
      localResolve(),
      babel({
        exclude: /node_modules/,
        runtimeHelpers: true,
        plugins: [['@babel/transform-runtime', { useESModules: true }]],
      }),
      sizeSnapshot(),
    ],
  },
]


let config
switch (process.env.BUILD_ENV) {
  case 'cjs':
    config = cjs
    break
  case 'esm':
    config = esm
    break
  default :
    config = cjs.concat(esm)
}

module.exports = config
