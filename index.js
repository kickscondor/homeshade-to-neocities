/*jslint node:true */
/*global hexo */
var NeoCities = require('neocities'),
    recursive = require('recursive-readdir'),
    fatalMessage = [
        'DEPLOYMENT FAILED',
        'You should check deployment settings in _config.yml first!',
        '',
        'Example:',
        '  deploy:',
        '    type: neocities',
        '    user: <user>',
        '    pass: <pass>',
        '',
        'For more help, you can check the docs: ' + 'http://hexo.io/docs/deployment.html'.underline
    ].join('\n');

hexo.extend.deployer.register('neocities', function (args, callback) {
    'use strict';
    var api,
        logger = this.log,
        responseHandler = function responseHandler(response) {
            if (response.result === 'error') {
                logger.error('Response from NeoCities: ');
                logger.error(response.error_type);
                logger.error(response.message);
            } else if (response.result === 'success') {
                logger.info('Response from NeoCities: ');
                logger.info(response.result);
                logger.info(response.message);
            } else {
                logger.warn(JSON.stringify(response));
            }

            return callback();
        },
        recursiveReadHandler = function recursiveReadHandler(err, files) {
            var stripPublicDir = function stripPublicDir(file) {
                return file.replace(hexo.public_dir, '');
            },
                toFileObject = function toFileObject(filePath) {
                    var fileName = stripPublicDir(filePath);
                    return {
                        name: fileName,
                        path: filePath
                    };
                },
                collectedPaths;

            if (err) {
                throw new Error(err);
            }

            collectedPaths = files
                .map(toFileObject);

            api = new NeoCities(args.user, args.pass);
            api.upload(collectedPaths, responseHandler);
        };

    if (!args.user || args.pass === undefined) {
        logger.fatal(fatalMessage);
        return callback();
    }

    recursive(hexo.public_dir, recursiveReadHandler);
});
