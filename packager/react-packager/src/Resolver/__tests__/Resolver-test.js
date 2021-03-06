/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

jest.dontMock('../')
  .dontMock('underscore');

jest.mock('path');

const Promise = require('promise');
const Resolver = require('../');

const path = require('path');
const _ = require('underscore');

let DependencyGraph = jest.genMockFn();
jest.setMock('node-haste', DependencyGraph);
let Module;
let Polyfill;

describe('Resolver', function() {
  beforeEach(function() {
    DependencyGraph.mockClear();
    Module = jest.genMockFn().mockImpl(function() {
      this.getName = jest.genMockFn();
      this.getDependencies = jest.genMockFn();
      this.isPolyfill = jest.genMockFn().mockReturnValue(false);
      this.isJSON = jest.genMockFn().mockReturnValue(false);
    });
    Polyfill = jest.genMockFn().mockImpl(function() {
      var polyfill = new Module();
      polyfill.isPolyfill.mockReturnValue(true);
      return polyfill;
    });

    DependencyGraph.replacePatterns = require.requireActual('node-haste/lib/lib/replacePatterns');
    DependencyGraph.prototype.createPolyfill = jest.genMockFn();
    DependencyGraph.prototype.getDependencies = jest.genMockFn();

    // For the polyfillDeps
    path.join = jest.genMockFn().mockImpl((a, b) => b);

    DependencyGraph.prototype.load = jest.genMockFn().mockImpl(() => Promise.resolve());
  });

  class ResolutionResponseMock {
    constructor({dependencies, mainModuleId}) {
      this.dependencies = dependencies;
      this.mainModuleId = mainModuleId;
    }

    prependDependency(dependency) {
      this.dependencies.unshift(dependency);
    }

    finalize() {
      return Promise.resolve(this);
    }

    getResolvedDependencyPairs() {
      return [];
    }
  }

  function createModule(id, dependencies) {
    var module = new Module({});
    module.getName.mockImpl(() => Promise.resolve(id));
    module.getDependencies.mockImpl(() => Promise.resolve(dependencies));
    return module;
  }

  function createJsonModule(id) {
    const module = createModule(id, []);
    module.isJSON.mockReturnValue(true);
    return module;
  }

  function createPolyfill(id, dependencies) {
    var polyfill = new Polyfill({});
    polyfill.getName = jest.genMockFn().mockImpl(() => Promise.resolve(id));
    polyfill.getDependencies =
      jest.genMockFn().mockImpl(() => Promise.resolve(dependencies));
    return polyfill;
  }

  describe('getDependencies', function() {
    it('forwards transform options to the dependency graph', function() {
      const transformOptions = {arbitrary: 'options'};
      const platform = 'ios';
      const entry = '/root/index.js';

      DependencyGraph.prototype.getDependencies.mockImplementation(
        () => Promise.reject());
      new Resolver({projectRoot: '/root', })
        .getDependencies(entry, {platform}, transformOptions);
      expect(DependencyGraph.prototype.getDependencies).toBeCalledWith({
        entryPath: entry,
        platform: platform,
        transformOptions: transformOptions,
        recursive: true,
      });
    });

    pit('should get dependencies with polyfills', function() {
      var module = createModule('index');
      var deps = [module];

      var depResolver = new Resolver({
        projectRoot: '/root',
      });

      DependencyGraph.prototype.getDependencies.mockImpl(function() {
        return Promise.resolve(new ResolutionResponseMock({
          dependencies: deps,
          mainModuleId: 'index',
        }));
      });

      return depResolver.getDependencies('/root/index.js', { dev: false })
        .then(function(result) {
          expect(result.mainModuleId).toEqual('index');
          expect(result.dependencies[result.dependencies.length - 1]).toBe(module);
          expect(_.pluck(DependencyGraph.prototype.createPolyfill.mock.calls, 0)).toEqual([
            { file: 'polyfills/polyfills.js',
              id: 'polyfills/polyfills.js',
              dependencies: []
            },
            { id: 'polyfills/console.js',
              file: 'polyfills/console.js',
              dependencies: [
                'polyfills/polyfills.js'
              ],
            },
            { id: 'polyfills/error-guard.js',
              file: 'polyfills/error-guard.js',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js'
              ],
            },
            { id: 'polyfills/String.prototype.es6.js',
              file: 'polyfills/String.prototype.es6.js',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js',
                'polyfills/error-guard.js'
              ],
            },
            { id: 'polyfills/Array.prototype.es6.js',
              file: 'polyfills/Array.prototype.es6.js',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js',
                'polyfills/error-guard.js',
                'polyfills/String.prototype.es6.js',
              ],
            },
            { id: 'polyfills/Array.es6.js',
              file: 'polyfills/Array.es6.js',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js',
                'polyfills/error-guard.js',
                'polyfills/String.prototype.es6.js',
                'polyfills/Array.prototype.es6.js',
              ],
            },
            { id: 'polyfills/Object.es7.js',
              file: 'polyfills/Object.es7.js',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js',
                'polyfills/error-guard.js',
                'polyfills/String.prototype.es6.js',
                'polyfills/Array.prototype.es6.js',
                'polyfills/Array.es6.js',
              ],
            },
            { id: 'polyfills/babelHelpers.js',
              file: 'polyfills/babelHelpers.js',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js',
                'polyfills/error-guard.js',
                'polyfills/String.prototype.es6.js',
                'polyfills/Array.prototype.es6.js',
                'polyfills/Array.es6.js',
                'polyfills/Object.es7.js',
              ],
            },
          ]);
        });
    });

    pit('should get dependencies with polyfills', function() {
      var module = createModule('index');
      var deps = [module];

      var depResolver = new Resolver({
        projectRoot: '/root',
      });

      DependencyGraph.prototype.getDependencies.mockImpl(function() {
        return Promise.resolve(new ResolutionResponseMock({
          dependencies: deps,
          mainModuleId: 'index',
        }));
      });

      const polyfill = {};
      DependencyGraph.prototype.createPolyfill.mockReturnValueOnce(polyfill);
      return depResolver.getDependencies('/root/index.js', { dev: true })
        .then(function(result) {
          expect(result.mainModuleId).toEqual('index');
          expect(DependencyGraph.mock.instances[0].getDependencies)
              .toBeCalledWith({entryPath: '/root/index.js', recursive: true});
          expect(result.dependencies[0]).toBe(polyfill);
          expect(result.dependencies[result.dependencies.length - 1])
              .toBe(module);
        });
    });

    pit('should pass in more polyfills', function() {
      var module = createModule('index');
      var deps = [module];

      var depResolver = new Resolver({
        projectRoot: '/root',
        polyfillModuleNames: ['some module'],
      });

      DependencyGraph.prototype.getDependencies.mockImpl(function() {
        return Promise.resolve(new ResolutionResponseMock({
          dependencies: deps,
          mainModuleId: 'index',
        }));
      });

      return depResolver.getDependencies('/root/index.js', { dev: false })
        .then((result) => {
          expect(result.mainModuleId).toEqual('index');
          expect(DependencyGraph.prototype.createPolyfill.mock.calls[result.dependencies.length - 2]).toEqual([
            { file: 'some module',
              id: 'some module',
              dependencies: [
                'polyfills/polyfills.js',
                'polyfills/console.js',
                'polyfills/error-guard.js',
                'polyfills/String.prototype.es6.js',
                'polyfills/Array.prototype.es6.js',
                'polyfills/Array.es6.js',
                'polyfills/Object.es7.js',
                'polyfills/babelHelpers.js',
              ]
            },
          ]);
        });
    });
  });

  describe('wrapModule', function() {
    pit('should resolve modules', function() {
      var depResolver = new Resolver({
        projectRoot: '/root',
      });

      /*eslint-disable */
      var code = [
        // require
        'require("x")',
        'require("y")',
        'require( \'z\' )',
        'require( "a")',
        'require("b" )',
      ].join('\n');
      /*eslint-disable */

      function *findDependencyOffsets() {
        const re = /(['"']).*?\1/g;
        let match;
        while ((match = re.exec(code))) {
          yield match.index;
        }
      }

      const dependencyOffsets = Array.from(findDependencyOffsets());
      const module = createModule('test module', ['x', 'y']);
      const resolutionResponse = new ResolutionResponseMock({
        dependencies: [module],
        mainModuleId: 'test module',
      });

      resolutionResponse.getResolvedDependencyPairs = (module) => {
        return [
          ['x', createModule('changed')],
          ['y', createModule('Y')],
        ];
      }

      return depResolver.wrapModule({
        resolutionResponse,
        module: createModule('test module', ['x', 'y']),
        name: 'test module',
        code,
        meta: {dependencyOffsets}
      }).then(({code: processedCode}) => {
        expect(processedCode).toEqual([
          '__d("test module", function(global, require, module, exports) {' +
          // require
          'require("changed")',
          'require("Y")',
          'require( \'z\' )',
          'require( "a")',
          'require("b" )',
          '});',
        ].join('\n'));
      });
    });

    pit('should pass through passed-in source maps', () => {
      const module = createModule('test module');
      const resolutionResponse = new ResolutionResponseMock({
        dependencies: [module],
        mainModuleId: 'test module',
      });
      const inputMap = {version: 3, mappings: 'ARBITRARY'};
      return new Resolver({projectRoot: '/root'}).wrapModule({
        resolutionResponse,
        module,
        name: 'test module',
        code: 'arbitrary(code)',
        map: inputMap,
      }).then(({map}) => expect(map).toBe(inputMap));
    });

    pit('should resolve polyfills', function () {
      const depResolver = new Resolver({
        projectRoot: '/root',
      });
      const polyfill = createPolyfill('test polyfill', []);
      const code = [
        'global.fetch = () => 1;',
      ].join('');
      return depResolver.wrapModule({
        module: polyfill,
        code
      }).then(({code: processedCode}) => {
        expect(processedCode).toEqual([
          '(function(global) {',
          'global.fetch = () => 1;',
          "\n})(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);",
        ].join(''));
      });
    });

    describe('JSON files:', () => {
      const code = JSON.stringify({arbitrary: "data"});
      const id = 'arbitrary.json';
      let depResolver, module, resolutionResponse;

      beforeEach(() => {
        depResolver = new Resolver({projectRoot: '/root'});
        module = createJsonModule(id);
        resolutionResponse = new ResolutionResponseMock({
          dependencies: [module],
          mainModuleId: id,
        });
      });

      pit('should prefix JSON files with `module.exports=`', () => {
        return depResolver
          .wrapModule({resolutionResponse, module, name: id, code})
          .then(({code: processedCode}) =>
            expect(processedCode).toEqual([
              `__d(${JSON.stringify(id)}, function(global, require, module, exports) {`,
              `module.exports = ${code}\n});`,
            ].join('')));
      });
    });

    describe('minification:', () => {
      const code ='arbitrary(code)';
      const id = 'arbitrary.js';
      let depResolver, minifyCode, module, resolutionResponse, sourceMap;

      beforeEach(() => {
        minifyCode = jest.genMockFn().mockImpl((filename, code, map) =>
          Promise.resolve({code, map}));
        depResolver = new Resolver({
          projectRoot: '/root',
          minifyCode
        });
        module = createModule(id);
        module.path = '/arbitrary/path.js';
        resolutionResponse = new ResolutionResponseMock({
          dependencies: [module],
          mainModuleId: id,
        });
        sourceMap = {version: 3, sources: ['input'], mappings: 'whatever'};
      });

      pit('should invoke the minifier with the wrapped code', () => {
        const wrappedCode = `__d("${id}", function(global, require, module, exports) {${code}\n});`
        return depResolver
          .wrapModule({
            resolutionResponse,
            module,
            name: id,
            code,
            map: sourceMap,
            minify: true
          }).then(() => {
            expect(minifyCode).toBeCalledWith(module.path, wrappedCode, sourceMap);
          });
      });

      pit('should use minified code', () => {
        const minifiedCode = 'minified(code)';
        const minifiedMap = {version: 3, file: ['minified']};
        minifyCode.mockReturnValue(Promise.resolve({code: minifiedCode, map: minifiedMap}));
        return depResolver
          .wrapModule({resolutionResponse, module, name: id, code, minify: true})
          .then(({code, map}) => {
            expect(code).toEqual(minifiedCode);
            expect(map).toEqual(minifiedMap);
          });
      });
    });
  });
});
