/**
 *
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const PHPAssocArrayUtils = require('./src/php');


class PhpWebpackPlugin {
    constructor(options) {
        options = options || {};
        this.options = {
            filename: options.filename || 'vueChunks.php',
            entryPoint: options.entryPoint,
            customOutput: options.customOutput || '',
        };
        if (!this.options.filename.endsWith('.php')) this.options.filename += '.php';
    }

    apply(compiler) {

        const options = this.options;
        const genPHPOutputAssocArray = (entryPoints=[]) => {
            let output = PHPAssocArrayUtils.phpHeader();
            output += PHPAssocArrayUtils.returnWithBracket(0);
            entryPoints.forEach(item => {
                const {name, chunks, assets, mode} = item;
                output += PHPAssocArrayUtils.arrayKeyWithGT(name, 1);
                output += PHPAssocArrayUtils.openingBracket(0);
                assets.forEach((chunk, key) => {
                    if (assets[key].indexOf('map') === -1) {
                        let asset = (mode === 'build') ?
                            path.join(compiler.options.output.publicPath, assets[key]) :
                            assets[key];
                        output += PHPAssocArrayUtils.arrayKeyWithGT(chunk, 2) + ` '${asset}',\n`
                    }
                });
                output += PHPAssocArrayUtils.closingBracket(1);
            });
            output += PHPAssocArrayUtils.closingBracket(0, true);
            return output;
        };

        const mkOutputDir = (dir) => {
            // Make webpack output directory if it doesn't already exist
            try {
                fs.mkdirSync(dir);
            } catch (err) {
                // If it does exist, don't worry unless there's another error
                if (err.code !== 'EEXIST') throw err;
            }
        };

        compiler.hooks.afterEmit.tap("webpack-dev-assets", (compilation,done) => {
            const devServer = compilation.options.devServer;
            let devServerUrl = null;
            const stats = compilation.getStats().toJson();
            const {entrypoints} = stats;
            const entryPoint = options.entryPoint;
            let entryPointsArray  = [];

            if (!_.isEmpty(devServer)) {
                const protocol = devServer.https ? 'https://' : 'http://';
                const host = devServer.host ? devServer.host : '0.0.0.0';
                const port = devServer.port ? devServer.port : '8080';
                devServerUrl = protocol + host + ':' + port;
            }

            if (!entryPoint) {
                _.mapKeys(entrypoints, (value, key) => {
                    entryPointsArray.push({
                        mode: 'build',
                        name: key,
                        chunks: value.chunks,
                        assets: value.assets,
                    });

                    const devAssets = _.map(value.chunks, (nameAsset) => {
                        return devServerUrl + '/js/' + nameAsset + '.js';
                    })
                    entryPointsArray.push({
                        mode: 'serve',
                        name: key + 'Serve',
                        chunks: value.chunks,
                        assets: devAssets,
                    });
                });
            } else {
                if (entrypoints[entryPoint]) {
                    entryPointsArray.push({
                        name: entryPoint,
                        chunks: entrypoints[entryPoint].chunks,
                        assets: entrypoints[entryPoint].assets,
                    });
                }
            }

            const output = genPHPOutputAssocArray(entryPointsArray);

            mkOutputDir(path.resolve(compiler.options.output.path, options.customOutput));
            fs.writeFileSync(path.join(compiler.options.output.path, options.customOutput, options.filename),output, done );
        });
    }
}

module.exports = PhpWebpackPlugin;