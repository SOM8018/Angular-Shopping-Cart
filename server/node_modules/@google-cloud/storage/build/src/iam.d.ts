/*!
 * Copyright 2017 Google Inc. All Rights Reserved.
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
import { Bucket } from './bucket';
/**
 * Get and set IAM policies for your Cloud Storage bucket.
 *
 * @see [Cloud Storage IAM Management](https://cloud.google.com/storage/docs/access-control/iam#short_title_iam_management)
 * @see [Granting, Changing, and Revoking Access](https://cloud.google.com/iam/docs/granting-changing-revoking-access)
 * @see [IAM Roles](https://cloud.google.com/iam/docs/understanding-roles)
 *
 * @constructor Iam
 * @mixin
 *
 * @param {Bucket} bucket The parent instance.
 * @example
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('my-bucket');
 * // bucket.iam
 */
declare class Iam {
    private request_;
    private resourceId_;
    constructor(bucket: Bucket);
    /**
     * @typedef {object} GetPolicyRequest
     * @property {string} userProject The ID of the project which will be billed for
     *     the request.
     */
    /**
     * @typedef {array} GetPolicyResponse
     * @property {object} 0 The policy.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetPolicyCallback
     * @param {?Error} err Request error, if any.
     * @param {object} acl The policy.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get the IAM policy.
     *
     * @param {GetPolicyRequest} [options] Request options.
     * @param {GetPolicyCallback} [callback] Callback function.
     * @returns {Promise<GetPolicyResponse>}
     *
     * @see [Buckets: setIamPolicy API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/buckets/getIamPolicy}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     * bucket.iam.getPolicy(function(err, policy, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.iam.getPolicy().then(function(data) {
     *   const policy = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * @example <caption>include:samples/iam.js</caption>
     * region_tag:storage_view_bucket_iam_members
     * Example of retrieving a bucket's IAM policy:
     */
    getPolicy(options: any, callback?: any): void;
    /**
     * @typedef {array} SetPolicyResponse
     * @property {object} 0 The policy.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback SetPolicyCallback
     * @param {?Error} err Request error, if any.
     * @param {object} acl The policy.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Set the IAM policy.
     *
     * @throws {Error} If no policy is provided.
     *
     * @param {object} policy The policy.
     * @param {array} policy.bindings Bindings associate members with roles.
     * @param {string} [policy.etag] Etags are used to perform a read-modify-write.
     * @param {object} [options] Configuration opbject.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {SetPolicyCallback} callback Callback function.
     * @returns {Promise<SetPolicyResponse>}
     *
     * @see [Buckets: setIamPolicy API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/buckets/setIamPolicy}
     * @see [IAM Roles](https://cloud.google.com/iam/docs/understanding-roles)
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     *
     * const myPolicy = {
     *   bindings: [
     *     {
     *       role: 'roles/storage.admin',
     *       members:
     * ['serviceAccount:myotherproject@appspot.gserviceaccount.com']
     *     }
     *   ]
     * };
     *
     * bucket.iam.setPolicy(myPolicy, function(err, policy, apiResponse) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.iam.setPolicy(myPolicy).then(function(data) {
     *   const policy = data[0];
     *   const apiResponse = data[1];
     * });
     *
     * @example <caption>include:samples/iam.js</caption>
     * region_tag:storage_add_bucket_iam_member
     * Example of adding to a bucket's IAM policy:
     *
     * @example <caption>include:samples/iam.js</caption>
     * region_tag:storage_remove_bucket_iam_member
     * Example of removing from a bucket's IAM policy:
     */
    setPolicy(policy: any, options: any, callback?: any): void;
    /**
     * @typedef {array} TestIamPermissionsResponse
     * @property {object[]} 0 A subset of permissions that the caller is allowed.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback TestIamPermissionsCallback
     * @param {?Error} err Request error, if any.
     * @param {object[]} acl A subset of permissions that the caller is allowed.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Test a set of permissions for a resource.
     *
     * @throws {Error} If permissions are not provided.
     *
     * @param {string|string[]} permissions The permission(s) to test for.
     * @param {object} [options] Configuration object.
     * @param {string} [options.userProject] The ID of the project which will be
     *     billed for the request.
     * @param {TestIamPermissionsCallback} [callback] Callback function.
     * @returns {Promise<TestIamPermissionsResponse>}
     *
     * @see [Buckets: testIamPermissions API Documentation]{@link https://cloud.google.com/storage/docs/json_api/v1/buckets/testIamPermissions}
     *
     * @example
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const bucket = storage.bucket('my-bucket');
     *
     * //-
     * // Test a single permission.
     * //-
     * const test = 'storage.buckets.delete';
     *
     * bucket.iam.testPermissions(test, function(err, permissions, apiResponse) {
     *   console.log(permissions);
     *   // {
     *   //   "storage.buckets.delete": true
     *   // }
     * });
     *
     * //-
     * // Test several permissions at once.
     * //-
     * const tests = [
     *   'storage.buckets.delete',
     *   'storage.buckets.get'
     * ];
     *
     * bucket.iam.testPermissions(tests, function(err, permissions) {
     *   console.log(permissions);
     *   // {
     *   //   "storage.buckets.delete": false,
     *   //   "storage.buckets.get": true
     *   // }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * bucket.iam.testPermissions(test).then(function(data) {
     *   const permissions = data[0];
     *   const apiResponse = data[1];
     * });
     */
    testPermissions(permissions: any, options: any, callback?: any): void;
}
export { Iam };
