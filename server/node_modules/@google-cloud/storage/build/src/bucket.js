/**
 * Copyright 2014-2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const arrify = require("arrify");
const async = require("async");
const common_1 = require("@google-cloud/common");
const paginator_1 = require("@google-cloud/paginator");
const promisify_1 = require("@google-cloud/promisify");
const extend = require("extend");
const fs = require("fs");
const is = require("is");
const mime = require("mime-types");
const path = require("path");
const snakeize = require('snakeize');
const request = require("request");
const acl_1 = require("./acl");
const file_1 = require("./file");
const iam_1 = require("./iam");
const notification_1 = require("./notification");
/**
 * The size of a file (in bytes) must be greater than this number to
 * automatically trigger a resumable upload.
 *
 * @const {number}
 * @private
 */
const RESUMABLE_THRESHOLD = 5000000;
/**
 * Create a Bucket object to interact with a Cloud Storage bucket.
 *
 * @class
 * @hideconstructor
 *
 * @param {Storage} storage A {@link Storage} instance.
 * @param {string} name The name of the bucket.
 * @param {object} [options] Configuration object.
 * @param {string} [options.userProject] User project.
 *
 * @example
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('albums');
 */
class Bucket extends common_1.ServiceObject {
    constructor(storage, name, options) {
        options = options || {};
        // Allow for "gs://"-style input, and strip any trailing slashes.
        name = name.replace(/^gs:\/\//, '').replace(/\/+$/, '');
        const methods = {
            /**
             * Create a bucket.
             *
             * @method Bucket#create
             * @param {CreateBucketOptions} [metadata] Metadata to set for the bucket.
             * @param {CreateBucketCallback} [callback] Callback function.
             * @returns {Promise<CreateBucketResponse>}
             *
             * @example
             * const {Storage} = require('@google-cloud/storage');
             * const storage = new Storage();
             * const bucket = storage.bucket('albums');
             * bucket.create(function(err, bucket, apiResponse) {
             *   if (!err) {
             *     // The bucket was created successfully.
             *   }
             * });
             *
             * //-
             * // If the callback is omitted, we'll return a Promise.
             * //-
             * bucket.create().then(function(data) {
             *   const bucket = data[0];
             *   const apiResponse = data[1];
             * });
             */
            create: true,
        };
        super({
            parent: storage,
            baseUrl: '/b',
            id: name,
            createMethod: storage.createBucket.bind(storage),
            methods,
            requestModule: request,
        });
        this.name = name;
        this.storage = storage;
        this.userProject = options.userProject;
        this.acl = new acl_1.Acl({
            request: this.request.bind(this),
            pathPrefix: '/acl',
        });
        this.acl.default = new acl_1.Acl({
            request: this.request.bind(this),
            pathPrefix: '/defaultObjectAcl',
        });
        this.iam = new iam_1.Iam(this);
        this.getFilesStream = paginator_1.paginator.streamify('getFiles');
    }
    combine(sources, destination, optionsOrCallback, callback) {
        if (!is.array(sources) || sources.length < 2) {
            throw new Error('You must provide at least two source files.');
        }
        if (!destination) {
            throw new Error('A destination file must be specified.');
        }
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        const convertToFile = (file) => {
            if (file instanceof file_1.File) {
                return file;
            }
            return this.file(file);
        };
        // tslint:disable-next-line:no-any
        sources = sources.map(convertToFile);
        const destinationFile = convertToFile(destination);
        callback = callback || common_1.util.noop;
        if (!destinationFile.metadata.contentType) {
            const destinationContentType = mime.contentType(destinationFile.name);
            if (destinationContentType) {
                destinationFile.metadata.contentType = destinationContentType;
            }
        }
        // Make the request from the destination File object.
        destinationFile.request({
            method: 'POST',
            uri: '/compose',
            json: {
                destination: {
                    contentType: destinationFile.metadata.contentType,
                },
                // tslint:disable-next-line:no-any
                sourceObjects: sources.map(source => {
                    const sourceObject = {
                        name: source.name,
                    };
                    if (source.metadata && source.metadata.generation) {
                        sourceObject.generation = source.metadata.generation;
                    }
                    return sourceObject;
                }),
            },
            qs: options,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            callback(null, destinationFile, resp);
        });
    }
    createChannel(id, config, optionsOrCallback, callback) {
        if (!is.string(id)) {
            throw new Error('An ID is required to create a channel.');
        }
        if (!is.string(config.address)) {
            throw new Error('An address is required to create a channel.');
        }
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        this.request({
            method: 'POST',
            uri: '/o/watch',
            json: extend({
                id,
                type: 'web_hook',
            }, config),
            qs: options,
        }, (err, apiResponse) => {
            if (err) {
                callback(err, null, apiResponse);
                return;
            }
            const resourceId = apiResponse.resourceId;
            const channel = this.storage.channel(id, resourceId);
            channel.metadata = apiResponse;
            callback(null, channel, apiResponse);
        });
    }
    createNotification(topic, optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        if (is.object(topic) && common_1.util.isCustomType(topic, 'pubsub/topic')) {
            // tslint:disable-next-line:no-any
            topic = topic.name;
        }
        if (!is.string(topic)) {
            throw new Error('A valid topic name is required.');
        }
        const body = Object.assign({ topic }, options);
        if (body.topic.indexOf('projects') !== 0) {
            body.topic = 'projects/{{projectId}}/topics/' + body.topic;
        }
        body.topic = '//pubsub.googleapis.com/' + body.topic;
        if (!body.payloadFormat) {
            body.payloadFormat = 'JSON_API_V1';
        }
        const query = {};
        if (body.userProject) {
            query.userProject = body.userProject;
            delete body.userProject;
        }
        this.request({
            method: 'POST',
            uri: '/notificationConfigs',
            json: snakeize(body),
            qs: query,
        }, (err, apiResponse) => {
            if (err) {
                callback(err, null, apiResponse);
                return;
            }
            const notification = this.notification(apiResponse.id);
            notification.metadata = apiResponse;
            callback(null, notification, apiResponse);
        });
    }
    delete(optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        this.request({
            method: 'DELETE',
            uri: '',
            qs: options,
        }, callback || common_1.util.noop);
    }
    deleteFiles(queryOrCallback, callback) {
        let query = {};
        if (typeof queryOrCallback === 'function') {
            callback = queryOrCallback;
        }
        else if (queryOrCallback) {
            query = queryOrCallback;
        }
        const MAX_PARALLEL_LIMIT = 10;
        const errors = [];
        this.getFiles(query, (err, files) => {
            if (err) {
                callback(err, {});
                return;
            }
            const deleteFile = (file, callback) => {
                file.delete(query, (err) => {
                    if (err) {
                        if (query.force) {
                            errors.push(err);
                            callback();
                            return;
                        }
                        callback(err);
                        return;
                    }
                    callback(null);
                });
            };
            // Iterate through each file and attempt to delete it.
            async.eachLimit(files, MAX_PARALLEL_LIMIT, deleteFile, err => {
                if (err || errors.length > 0) {
                    callback(err || errors);
                    return;
                }
                callback(null);
            });
        });
    }
    deleteLabels(labelsOrCallback, callback) {
        let labels = new Array();
        if (typeof labelsOrCallback === 'function') {
            callback = labelsOrCallback;
        }
        else if (labelsOrCallback) {
            labels = arrify(labelsOrCallback);
        }
        const deleteLabels = labels => {
            const nullLabelMap = labels.reduce((nullLabelMap, labelKey) => {
                nullLabelMap[labelKey] = null;
                return nullLabelMap;
            }, {});
            this.setLabels(nullLabelMap, callback);
        };
        if (labels.length === 0) {
            this.getLabels((err, labels) => {
                if (err) {
                    callback(err);
                    return;
                }
                deleteLabels(Object.keys(labels));
            });
        }
        else {
            deleteLabels(labels);
        }
    }
    disableRequesterPays(callback) {
        this.setMetadata({
            billing: {
                requesterPays: false,
            },
        }, callback || common_1.util.noop);
    }
    enableRequesterPays(callback) {
        this.setMetadata({
            billing: {
                requesterPays: true,
            },
        }, callback || common_1.util.noop);
    }
    exists(optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        options = options || {};
        this.get(options, err => {
            if (err) {
                if (err.code === 404) {
                    callback(null, false);
                }
                else {
                    callback(err);
                }
                return;
            }
            callback(null, true);
        });
    }
    /**
     * Create a {@link File} object. See {@link File} to see how to handle
     * the different use cases you may have.
     *
     * @param {string} name The name of the file in this bucket.
     * @param {object} [options] Configuration options.
     * @param {string|number} [options.generation] Only use a specific revision of
     *     this file.
     * @param {string} [options.encryptionKey] A custom encryption key. See
     *     [Customer-supplied Encryption
     * Keys](https://cloud.google.com/storage/docs/encryption#customer-supplied).
     * @param {string} [options.kmsKeyName] The name of the Cloud KMS key that will
     *     be used to encrypt the object. Must be in the format:
     *     `projects/my-project/locations/location/keyRings/my-kr/cryptoKeys/my-key`.
     *     KMS key ring must use the same location as the bucket.
     * @returns {File}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     * const file = bucket.file('my-existing-file.png');
     */
    file(name, options) {
        if (!name) {
            throw Error('A file name must be specified.');
        }
        return new file_1.File(this, name, options);
    }
    get(optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        const autoCreate = options.autoCreate;
        delete options.autoCreate;
        const onCreate = (err, bucket, apiResponse) => {
            if (err) {
                if (err.code === 409) {
                    this.get(options, callback);
                    return;
                }
                callback(err, null, apiResponse);
                return;
            }
            callback(null, bucket, apiResponse);
        };
        this.getMetadata(options, (err, metadata) => {
            if (err) {
                if (err.code === 404 && autoCreate) {
                    const args = [];
                    if (!is.empty(options)) {
                        args.push(options);
                    }
                    args.push(onCreate);
                    this.create.apply(this, args);
                    return;
                }
                callback(err, null, metadata);
                return;
            }
            callback(null, this, metadata);
        });
    }
    getFiles(queryOrCallback, callback) {
        let query = typeof queryOrCallback === 'object' ? queryOrCallback : {};
        if (!callback) {
            callback = queryOrCallback;
        }
        query = extend({}, query);
        if (query.directory) {
            query.prefix = `${query.directory}/`.replace(/\/*$/, '/');
            delete query.directory;
        }
        this.request({
            uri: '/o',
            qs: query,
        }, (err, resp) => {
            if (err) {
                // tslint:disable-next-line:no-any
                callback(err, null, null, resp);
                return;
            }
            const files = arrify(resp.items).map(file => {
                const options = {};
                if (query.versions) {
                    options.generation = file.generation;
                }
                if (file.kmsKeyName) {
                    options.kmsKeyName = file.kmsKeyName;
                }
                const fileInstance = this.file(file.name, options);
                fileInstance.metadata = file;
                return fileInstance;
            });
            let nextQuery = null;
            if (resp.nextPageToken) {
                nextQuery = extend({}, query, {
                    pageToken: resp.nextPageToken,
                });
            }
            // tslint:disable-next-line:no-any
            callback(null, files, nextQuery, resp);
        });
    }
    getLabels(optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        this.getMetadata(options, (err, metadata) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, metadata.labels || {});
        });
    }
    getMetadata(optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        this.request({
            uri: '',
            qs: options,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            this.metadata = resp;
            callback(null, this.metadata, resp);
        });
    }
    getNotifications(optionsOrCallback, callback) {
        let options = {};
        if (typeof optionsOrCallback === 'function') {
            callback = optionsOrCallback;
        }
        else if (optionsOrCallback) {
            options = optionsOrCallback;
        }
        this.request({
            uri: '/notificationConfigs',
            qs: options,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            const notifications = arrify(resp.items).map(notification => {
                const notificationInstance = this.notification(notification.id);
                notificationInstance.metadata = notification;
                return notificationInstance;
            });
            callback(null, notifications, resp);
        });
    }
    /**
     * Lock a previously-defined retention policy. This will prevent changes to
     * the policy.
     *
     * @throws {Error} if a metageneration is not provided.
     *
     * @param {Number|String} metageneration The bucket's metageneration. This is
     *     accesssible from calling {@link File#getMetadata}.
     * @param {SetBucketMetadataCallback} [callback] Callback function.
     * @returns {Promise<SetBucketMetadataResponse>}
     *
     * @example
     * const storage = require('@google-cloud/storage')();
     * const bucket = storage.bucket('albums');
     *
     * const metageneration = 2;
     *
     * bucket.lock(metageneration, function(err, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.lock(metageneration).then(function(data) {
     *   const apiResponse = data[0];
     * });
     */
    lock(metageneration, callback) {
        if (!is.number(metageneration) && !is.string(metageneration)) {
            throw new Error('A metageneration must be provided.');
        }
        this.request({
            method: 'POST',
            uri: '/lockRetentionPolicy',
            qs: {
                ifMetagenerationMatch: metageneration,
            },
        }, callback);
    }
    /**
     * @typedef {array} MakeBucketPrivateResponse
     * @property {File[]} 0 List of files made private.
     */
    /**
     * @callback MakeBucketPrivateCallback
     * @param {?Error} err Request error, if any.
     * @param {File[]} files List of files made private.
     */
    /**
     * Make the bucket listing private.
     *
     * You may also choose to make the contents of the bucket private by
     * specifying `includeFiles: true`. This will automatically run
     * {@link File#makePrivate} for every file in the bucket.
     *
     * When specifying `includeFiles: true`, use `force: true` to delay execution
     * of your callback until all files have been processed. By default, the
     * callback is executed after the first error. Use `force` to queue such
     * errors until all files have been processed, after which they will be
     * returned as an array as the first argument to your callback.
     *
     * NOTE: This may cause the process to be long-running and use a high number
     * of requests. Use with caution.
     *
     * @see [Buckets: patch API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/buckets/patch}
     *
     * @param {object} [options] Configuration options.
     * @param {boolean} [options.includeFiles=false] Make each file in the bucket
     *     private.
     * @param {boolean} [options.force] Queue errors occurred while making files
     *     private until all files have been processed.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {MakeBucketPrivateCallback} [callback] Callback function.
     * @returns {Promise<MakeBucketPrivateResponse>}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * //-
     * // Make the bucket private.
     * //-
     * bucket.makePrivate(function(err) {});
     *
     * //-
     * // Make the bucket and its contents private.
     * //-
     * const opts = {
     *   includeFiles: true
     * };
     *
     * bucket.makePrivate(opts, function(err, files) {
     *   // `err`:
     *   //    The first error to occur, otherwise null.
     *   //
     *   // `files`:
     *   //    Array of files successfully made private in the bucket.
     * });
     *
     * //-
     * // Make the bucket and its contents private, using force to suppress errors
     * // until all files have been processed.
     * //-
     * const opts = {
     *   includeFiles: true,
     *   force: true
     * };
     *
     * bucket.makePrivate(opts, function(errors, files) {
     *   // `errors`:
     *   //    Array of errors if any occurred, otherwise null.
     *   //
     *   // `files`:
     *   //    Array of files successfully made private in the bucket.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.makePrivate(opts).then(function(data) {
     *   const files = data[0];
     * });
     */
    makePrivate(options, callback) {
        if (is.fn(options)) {
            callback = options;
            options = {};
        }
        options = options || {};
        options.private = true;
        const setPredefinedAcl = done => {
            const query = {
                predefinedAcl: 'projectPrivate',
            };
            if (options.userProject) {
                query.userProject = options.userProject;
            }
            this.setMetadata({
                // You aren't allowed to set both predefinedAcl & acl properties on
                // a bucket so acl must explicitly be nullified.
                acl: null,
            }, query, done);
        };
        const makeFilesPrivate = done => {
            if (!options.includeFiles) {
                done();
                return;
            }
            this.makeAllFilesPublicPrivate_(options, done);
        };
        async.series([setPredefinedAcl, makeFilesPrivate], callback);
    }
    /**
     * @typedef {array} MakeBucketPublicResponse
     * @property {File[]} 0 List of files made public.
     */
    /**
     * @callback MakeBucketPublicCallback
     * @param {?Error} err Request error, if any.
     * @param {File[]} files List of files made public.
     */
    /**
     * Make the bucket publicly readable.
     *
     * You may also choose to make the contents of the bucket publicly readable by
     * specifying `includeFiles: true`. This will automatically run
     * {@link File#makePublic} for every file in the bucket.
     *
     * When specifying `includeFiles: true`, use `force: true` to delay execution
     * of your callback until all files have been processed. By default, the
     * callback is executed after the first error. Use `force` to queue such
     * errors until all files have been processed, after which they will be
     * returned as an array as the first argument to your callback.
     *
     * NOTE: This may cause the process to be long-running and use a high number
     * of requests. Use with caution.
     *
     * @see [Buckets: patch API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/buckets/patch}
     *
     * @param {object} [options] Configuration options.
     * @param {boolean} [options.includeFiles=false] Make each file in the bucket
     *     publicly readable.
     * @param {boolean} [options.force] Queue errors occurred while making files
     *     public until all files have been processed.
     * @param {MakeBucketPublicCallback} [callback] Callback function.
     * @returns {Promise<MakeBucketPublicResponse>}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * //-
     * // Make the bucket publicly readable.
     * //-
     * bucket.makePublic(function(err) {});
     *
     * //-
     * // Make the bucket and its contents publicly readable.
     * //-
     * const opts = {
     *   includeFiles: true
     * };
     *
     * bucket.makePublic(opts, function(err, files) {
     *   // `err`:
     *   //    The first error to occur, otherwise null.
     *   //
     *   // `files`:
     *   //    Array of files successfully made public in the bucket.
     * });
     *
     * //-
     * // Make the bucket and its contents publicly readable, using force to
     * // suppress errors until all files have been processed.
     * //-
     * const opts = {
     *   includeFiles: true,
     *   force: true
     * };
     *
     * bucket.makePublic(opts, function(errors, files) {
     *   // `errors`:
     *   //    Array of errors if any occurred, otherwise null.
     *   //
     *   // `files`:
     *   //    Array of files successfully made public in the bucket.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.makePublic(opts).then(function(data) {
     *   const files = data[0];
     * });
     */
    makePublic(options, callback) {
        if (is.fn(options)) {
            callback = options;
            options = {};
        }
        options = options || {};
        options.public = true;
        const addAclPermissions = done => {
            // Allow reading bucket contents while preserving original permissions.
            this.acl.add({
                entity: 'allUsers',
                role: 'READER',
            }, done);
        };
        const addDefaultAclPermissions = done => {
            this.acl.default.add({
                entity: 'allUsers',
                role: 'READER',
            }, done);
        };
        const makeFilesPublic = done => {
            if (!options.includeFiles) {
                done();
                return;
            }
            this.makeAllFilesPublicPrivate_(options, done);
        };
        async.series([addAclPermissions, addDefaultAclPermissions, makeFilesPublic], callback);
    }
    /**
     * Get a reference to a Cloud Pub/Sub Notification.
     *
     * @param {string} id ID of notification.
     * @returns {Notification}
     * @see Notification
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * const notification = bucket.notification('1');
     */
    notification(id) {
        if (!id) {
            throw new Error('You must supply a notification ID.');
        }
        return new notification_1.Notification(this, id);
    }
    /**
     * Remove an already-existing retention policy from this bucket, if it is not
     * locked.
     *
     * @param {SetBucketMetadataCallback} [callback] Callback function.
     * @returns {Promise<SetBucketMetadataResponse>}
     *
     * @example
     * const storage = require('@google-cloud/storage')();
     * const bucket = storage.bucket('albums');
     *
     * bucket.removeRetentionPeriod(function(err, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.removeRetentionPeriod().then(function(data) {
     *   const apiResponse = data[0];
     * });
     */
    removeRetentionPeriod(callback) {
        this.setMetadata({
            retentionPolicy: null,
        }, callback);
    }
    request(reqOpts, callback) {
        if (this.userProject && (!reqOpts.qs || !reqOpts.qs.userProject)) {
            reqOpts.qs = extend(reqOpts.qs, { userProject: this.userProject });
        }
        return super.request(reqOpts, callback);
    }
    /**
     * @typedef {array} SetLabelsResponse
     * @property {object} 0 The bucket metadata.
     */
    /**
     * @callback SetLabelsCallback
     * @param {?Error} err Request error, if any.
     * @param {object} metadata The bucket metadata.
     */
    /**
     * Set labels on the bucket.
     *
     * This makes an underlying call to {@link Bucket#setMetadata}, which
     * is a PATCH request. This means an individual label can be overwritten, but
     * unmentioned labels will not be touched.
     *
     * @param {object<string, string>} labels Labels to set on the bucket.
     * @param {object} [options] Configuration options.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {SetLabelsCallback} [callback] Callback function.
     * @returns {Promise<SetLabelsResponse>}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * const labels = {
     *   labelone: 'labelonevalue',
     *   labeltwo: 'labeltwovalue'
     * };
     *
     * bucket.setLabels(labels, function(err, metadata) {
     *   if (!err) {
     *     // Labels set successfully.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.setLabels(labels).then(function(data) {
     *   const metadata = data[0];
     * });
     */
    setLabels(labels, options, callback) {
        if (is.fn(options)) {
            callback = options;
            options = {};
        }
        callback = callback || common_1.util.noop;
        this.setMetadata({ labels }, options, callback);
    }
    /**
     * @typedef {array} SetBucketMetadataResponse
     * @property {object} 0 The bucket metadata.
     */
    /**
     * @callback SetBucketMetadataCallback
     * @param {?Error} err Request error, if any.
     * @param {object} metadata The bucket metadata.
     */
    /**
     * Set the bucket's metadata.
     *
     * @see [Buckets: patch API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/buckets/patch}
     *
     * @param {object<string, *>} metadata The metadata you wish to set.
     * @param {object} [options] Configuration options.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {SetBucketMetadataCallback} [callback] Callback function.
     * @returns {Promise<SetBucketMetadataResponse>}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * //-
     * // Set website metadata field on the bucket.
     * //-
     * const metadata = {
     *   website: {
     *     mainPageSuffix: 'http://example.com',
     *     notFoundPage: 'http://example.com/404.html'
     *   }
     * };
     *
     * bucket.setMetadata(metadata, function(err, apiResponse) {});
     *
     * //-
     * // Enable versioning for your bucket.
     * //-
     * bucket.setMetadata({
     *   versioning: {
     *     enabled: true
     *   }
     * }, function(err, apiResponse) {});
     *
     * //-
     * // Enable KMS encryption for objects within this bucket.
     * //-
     * bucket.setMetadata({
     *   encryption: {
     *     defaultKmsKeyName: 'projects/grape-spaceship-123/...'
     *   }
     * }, function(err, apiResponse) {});
     *
     * //-
     * // Set the default event-based hold value for new objects in this bucket.
     * //-
     * bucket.setMetadata({
     *   defaultEventBasedHold: true
     * }, function(err, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.setMetadata(metadata).then(function(data) {
     *   const apiResponse = data[0];
     * });
     */
    setMetadata(metadata, options, callback) {
        if (is.fn(options)) {
            callback = options;
            options = {};
        }
        callback = callback || common_1.util.noop;
        this.request({
            method: 'PATCH',
            uri: '',
            json: metadata,
            qs: options,
        }, (err, resp) => {
            if (err) {
                callback(err, resp);
                return;
            }
            this.metadata = resp;
            callback(null, resp);
        });
    }
    /**
     * Lock all objects contained in the bucket, based on their creation time. Any
     * attempt to overwrite or delete objects younger than the retention period
     * will result in a `PERMISSION_DENIED` error.
     *
     * An unlocked retention policy can be modified or removed from the bucket via
     * {@link File#removeRetentionPeriod} and {@link File#setRetentionPeriod}. A
     * locked retention policy cannot be removed or shortened in duration for the
     * lifetime of the bucket. Attempting to remove or decrease period of a locked
     * retention policy will result in a `PERMISSION_DENIED` error. You can still
     * increase the policy.
     *
     * @param {*} duration In seconds, the minimum retention time for all objects
     *     contained in this bucket.
     * @param {SetBucketMetadataCallback} [callback] Callback function.
     * @returns {Promise<SetBucketMetadataResponse>}
     *
     * @example
     * const storage = require('@google-cloud/storage')();
     * const bucket = storage.bucket('albums');
     *
     * const DURATION_SECONDS = 15780000; // 6 months.
     *
     * //-
     * // Lock the objects in this bucket for 6 months.
     * //-
     * bucket.setRetentionPeriod(DURATION_SECONDS, function(err, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.setRetentionPeriod(DURATION_SECONDS).then(function(data) {
     *   const apiResponse = data[0];
     * });
     */
    setRetentionPeriod(duration, callback) {
        this.setMetadata({
            retentionPolicy: {
                retentionPeriod: duration,
            },
        }, callback);
    }
    /**
     * @callback SetStorageClassCallback
     * @param {?Error} err Request error, if any.
     */
    /**
     * Set the default storage class for new files in this bucket.
     *
     * @see [Storage Classes]{@link https://cloud.google.com/storage/docs/storage-classes}
     *
     * @param {string} storageClass The new storage class. (`multi_regional`,
     *     `regional`, `standard`, `nearline`, `coldline`, or
     *     `durable_reduced_availability`)
     * @param {object} [options] Configuration options.
     * @param {string} [options.userProject] - The ID of the project which will be
     *     billed for the request.
     * @param {SetStorageClassCallback} [callback] Callback function.
     * @returns {Promise}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * bucket.setStorageClass('regional', function(err, apiResponse) {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   // The storage class was updated successfully.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.setStorageClass('regional').then(function() {});
     */
    setStorageClass(storageClass, options, callback) {
        // In case we get input like `storageClass`, convert to `storage_class`.
        storageClass = storageClass.replace(/-/g, '_')
            .replace(/([a-z])([A-Z])/g, (_, low, up) => {
            return low + '_' + up;
        })
            .toUpperCase();
        this.setMetadata({ storageClass }, options, callback);
    }
    /**
     * Set a user project to be billed for all requests made from this Bucket
     * object and any files referenced from this Bucket object.
     *
     * @param {string} userProject The user project.
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * bucket.setUserProject('grape-spaceship-123');
     */
    setUserProject(userProject) {
        this.userProject = userProject;
    }
    /**
     * @typedef {array} UploadResponse
     * @property {object} 0 The uploaded {@link File}.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback UploadCallback
     * @param {?Error} err Request error, if any.
     * @param {object} metadata The uploaded {@link File}.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Upload a file to the bucket. This is a convenience method that wraps
     * {@link File#createWriteStream}.
     *
     * You can specify whether or not an upload is resumable by setting
     * `options.resumable`. *Resumable uploads are enabled by default if your
     * input file is larger than 5 MB.*
     *
     * For faster crc32c computation, you must manually install
     * [`fast-crc32c`](http://www.gitnpm.com/fast-crc32c):
     *
     *     $ npm install --save fast-crc32c
     *
     * @see [Upload Options (Simple or Resumable)]{@link https://cloud.google.com/storage/docs/json_api/v1/how-tos/upload#uploads}
     * @see [Objects: insert API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/objects/insert}
     *
     * @param {string} pathString The fully qualified path to the file you
     *     wish to upload to your bucket.
     * @param {object} [options] Configuration options.
     * @param {string|File} [options.destination] The place to save
     *     your file. If given a string, the file will be uploaded to the bucket
     *     using the string as a filename. When given a File object, your local
     * file will be uploaded to the File object's bucket and under the File
     * object's name. Lastly, when this argument is omitted, the file is uploaded
     * to your bucket using the name of the local file.
     * @param {string} [options.encryptionKey] A custom encryption key. See
     *     [Customer-supplied Encryption
     * Keys](https://cloud.google.com/storage/docs/encryption#customer-supplied).
     * @param {boolean} [options.gzip] Automatically gzip the file. This will set
     *     `options.metadata.contentEncoding` to `gzip`.
     * @param {string} [options.kmsKeyName] The name of the Cloud KMS key that will
     *     be used to encrypt the object. Must be in the format:
     *     `projects/my-project/locations/location/keyRings/my-kr/cryptoKeys/my-key`.
     * @param {object} [options.metadata] See an
     *     [Objects: insert request
     * body](https://cloud.google.com/storage/docs/json_api/v1/objects/insert#request_properties_JSON).
     * @param {string} [options.offset] The starting byte of the upload stream, for
     *     resuming an interrupted upload. Defaults to 0.
     * @param {string} [options.predefinedAcl] Apply a predefined set of access
     *     controls to this object.
     *
     *     Acceptable values are:
     *     - **`authenticatedRead`** - Object owner gets `OWNER` access, and
     *       `allAuthenticatedUsers` get `READER` access.
     *
     *     - **`bucketOwnerFullControl`** - Object owner gets `OWNER` access, and
     *       project team owners get `OWNER` access.
     *
     *     - **`bucketOwnerRead`** - Object owner gets `OWNER` access, and project
     *       team owners get `READER` access.
     *
     *     - **`private`** - Object owner gets `OWNER` access.
     *
     *     - **`projectPrivate`** - Object owner gets `OWNER` access, and project
     *       team members get access according to their roles.
     *
     *     - **`publicRead`** - Object owner gets `OWNER` access, and `allUsers`
     * get `READER` access.
     * @param {boolean} [options.private] Make the uploaded file private. (Alias for
     *     `options.predefinedAcl = 'private'`)
     * @param {boolean} [options.public] Make the uploaded file public. (Alias for
     *     `options.predefinedAcl = 'publicRead'`)
     * @param {boolean} [options.resumable] Force a resumable upload. (default:
     *     true for files larger than 5 MB).
     * @param {string} [options.uri] The URI for an already-created resumable
     *     upload. See {@link File#createResumableUpload}.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {string|boolean} [options.validation] Possible values: `"md5"`,
     *     `"crc32c"`, or `false`. By default, data integrity is validated with an
     *     MD5 checksum for maximum reliability. CRC32c will provide better
     *     performance with less reliability. You may also choose to skip
     * validation completely, however this is **not recommended**.
     * @param {UploadCallback} [callback] Callback function.
     * @returns {Promise<UploadResponse>}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('albums');
     *
     * //-
     * // Upload a file from a local path.
     * //-
     * bucket.upload('/local/path/image.png', function(err, file, apiResponse) {
     *   // Your bucket now contains:
     *   // - "image.png" (with the contents of `/local/path/image.png')
     *
     *   // `file` is an instance of a File object that refers to your new file.
     * });
     *
     *
     * //-
     * // It's not always that easy. You will likely want to specify the filename
     * // used when your new file lands in your bucket.
     * //
     * // You may also want to set metadata or customize other options.
     * //-
     * const options = {
     *   destination: 'new-image.png',
     *   resumable: true,
     *   validation: 'crc32c',
     *   metadata: {
     *     metadata: {
     *       event: 'Fall trip to the zoo'
     *     }
     *   }
     * };
     *
     * bucket.upload('local-image.png', options, function(err, file) {
     *   // Your bucket now contains:
     *   // - "new-image.png" (with the contents of `local-image.png')
     *
     *   // `file` is an instance of a File object that refers to your new file.
     * });
     *
     * //-
     * // You can also have a file gzip'd on the fly.
     * //-
     * bucket.upload('index.html', { gzip: true }, function(err, file) {
     *   // Your bucket now contains:
     *   // - "index.html" (automatically compressed with gzip)
     *
     *   // Downloading the file with `file.download` will automatically decode
     * the
     *   // file.
     * });
     *
     * //-
     * // You may also re-use a File object, {File}, that references
     * // the file you wish to create or overwrite.
     * //-
     * const options = {
     *   destination: bucket.file('existing-file.png'),
     *   resumable: false
     * };
     *
     * bucket.upload('local-img.png', options, function(err, newFile) {
     *   // Your bucket now contains:
     *   // - "existing-file.png" (with the contents of `local-img.png')
     *
     *   // Note:
     *   // The `newFile` parameter is equal to `file`.
     * });
     *
     * //-
     * // To use
     * // <a
     * href="https://cloud.google.com/storage/docs/encryption#customer-supplied">
     * // Customer-supplied Encryption Keys</a>, provide the `encryptionKey`
     * option.
     * //-
     * const crypto = require('crypto');
     * const encryptionKey = crypto.randomBytes(32);
     *
     * bucket.upload('img.png', {
     *   encryptionKey: encryptionKey
     * }, function(err, newFile) {
     *   // `img.png` was uploaded with your custom encryption key.
     *
     *   // `newFile` is already configured to use the encryption key when making
     *   // operations on the remote object.
     *
     *   // However, to use your encryption key later, you must create a `File`
     *   // instance with the `key` supplied:
     *   const file = bucket.file('img.png', {
     *     encryptionKey: encryptionKey
     *   });
     *
     *   // Or with `file#setEncryptionKey`:
     *   const file = bucket.file('img.png');
     *   file.setEncryptionKey(encryptionKey);
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.upload('local-image.png').then(function(data) {
     *   const file = data[0];
     * });
     *
     * To upload a file from a URL, use {@link File#createWriteStream}.
     *
     * @example <caption>include:samples/files.js</caption>
     * region_tag:storage_upload_file
     * Another example:
     *
     * @example <caption>include:samples/encryption.js</caption>
     * region_tag:storage_upload_encrypted_file
     * Example of uploading an encrypted file:
     */
    upload(pathString, options, callback) {
        if (global['GCLOUD_SANDBOX_ENV']) {
            return;
        }
        if (is.fn(options)) {
            callback = options;
            options = {};
        }
        options = extend({
            metadata: {},
        }, options);
        let newFile;
        if (options.destination instanceof file_1.File) {
            newFile = options.destination;
        }
        else if (is.string(options.destination)) {
            // Use the string as the name of the file.
            newFile = this.file(options.destination, {
                encryptionKey: options.encryptionKey,
                kmsKeyName: options.kmsKeyName,
            });
        }
        else {
            // Resort to using the name of the incoming file.
            const destination = path.basename(pathString);
            newFile = this.file(destination, {
                encryptionKey: options.encryptionKey,
                kmsKeyName: options.kmsKeyName,
            });
        }
        const contentType = mime.contentType(path.basename(pathString));
        if (contentType && !options.metadata.contentType) {
            options.metadata.contentType = contentType;
        }
        if (is.boolean(options.resumable)) {
            upload();
        }
        else {
            // Determine if the upload should be resumable if it's over the threshold.
            fs.stat(pathString, (err, fd) => {
                if (err) {
                    callback(err);
                    return;
                }
                options.resumable = fd.size > RESUMABLE_THRESHOLD;
                upload();
            });
        }
        function upload() {
            fs.createReadStream(pathString)
                .on('error', callback)
                .pipe(newFile.createWriteStream(options))
                .on('error', callback)
                .on('finish', () => {
                callback(null, newFile, newFile.metadata);
            });
        }
    }
    /**
     * Iterate over all of a bucket's files, calling `file.makePublic()` (public)
     * or `file.makePrivate()` (private) on each.
     *
     * Operations are performed in parallel, up to 10 at once. The first error
     * breaks the loop, and will execute the provided callback with it. Specify
     * `{ force: true }` to suppress the errors.
     *
     * @private
     *
     * @param {object} options] Configuration options.
     * @param {boolean} [options.force] Suppress errors until all files have been
     *     processed.
     * @param {boolean} [options.private] Make files private.
     * @param {boolean} [options.public] Make files public.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {function} callback Callback function.
     */
    makeAllFilesPublicPrivate_(options, callback) {
        const MAX_PARALLEL_LIMIT = 10;
        const errors = [];
        const updatedFiles = [];
        this.getFiles(options, (err, files) => {
            if (err) {
                callback(err);
                return;
            }
            const processFile = (file, callback) => {
                const processedCallback = err => {
                    if (err) {
                        if (options.force) {
                            errors.push(err);
                            callback();
                            return;
                        }
                        callback(err);
                        return;
                    }
                    updatedFiles.push(file);
                    callback();
                };
                if (options.public) {
                    file.makePublic(processedCallback);
                }
                else if (options.private) {
                    file.makePrivate(options, processedCallback);
                }
            };
            // Iterate through each file and make it public or private.
            async.eachLimit(files, MAX_PARALLEL_LIMIT, processFile, err => {
                if (err || errors.length > 0) {
                    callback(err || errors, updatedFiles);
                    return;
                }
                callback(null, updatedFiles);
            });
        });
    }
    getId() {
        return this.id;
    }
}
exports.Bucket = Bucket;
/*! Developer Documentation
 *
 * These methods can be auto-paginated.
 */
paginator_1.paginator.extend(Bucket, 'getFiles');
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisify_1.promisifyAll(Bucket, {
    exclude: ['request', 'file', 'notification'],
});
//# sourceMappingURL=bucket.js.map