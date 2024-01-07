// Copyright (c) 2024, Brandon Lehmann <brandonlehmann@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import fetch, { Headers, HTTP_METHOD } from '@gibme/fetch';
import Cache from '@gibme/cache/memory';
import { Starlink } from './types';
export { Starlink } from './types';

/** @ignore */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Provides a base-level abstraction for interacting with the Starlink Enterprise API
 */
export default abstract class BaseAPI {
    private static token?: Starlink.Token;
    /**
     * We are limited to 250 requests per minute from a single IP address
     * this cache helps to track this and automatically times out old
     * requests
     */
    private static readonly cache = new Cache({ stdTTL: 60, checkperiod: 5 });
    private static readonly requestLimit = 250;
    public readonly baseUrl = 'https://web-api.starlink.com';

    private static async requestCount (): Promise<number> {
        return (await BaseAPI.cache.keys()).length;
    }

    // eslint-disable-next-line no-useless-constructor
    constructor (
        public readonly client_id: string,
        protected readonly client_secret: string
    ) {}

    /**
     * Attempts to authenticate with the Starlink Enterprise API
     * If it succeeds, the token is stored internally for later use
     *
     * @private
     */
    private async authenticate (): Promise<boolean> {
        const response = await fetch.post('https://api.starlink.com/auth/connect/token', {
            formData: {
                client_id: this.client_id,
                client_secret: this.client_secret,
                grant_type: 'client_credentials'
            }
        });

        if (!response.ok) return false;

        const token: Partial<Starlink.Token> = await response.json();

        if (token.access_token) {
            BaseAPI.token = token as Starlink.Token;

            return true;
        }

        delete BaseAPI.token;

        return false;
    }

    /**
     * Performs an HTTP delete request against the Starlink Enterprise API
     *
     * @param endpoint
     * @param params
     * @protected
     */
    protected async delete<Type extends Starlink.Response = any> (
        endpoint: string,
        params: { [key: string]: any } = {}
    ): Promise<Type> {
        return this.execute(HTTP_METHOD.DELETE, endpoint, params);
    }

    /**
     * Performs an HTTP request against the Starlink Enterprise API
     *
     * @param method
     * @param endpoint
     * @param params
     * @param payload
     * @param is_retry
     * @private
     */
    private async execute<Type extends Starlink.Response = any>
    (
        method: HTTP_METHOD,
        endpoint: string,
        params: { [key: string]: any } = {},
        payload?: { [key: string]: any } | string,
        is_retry = false
    ): Promise<Type> {
        // if we don't have a token, and we cannot authenticate to get one, fail
        if (!BaseAPI.token && !await this.authenticate()) {
            throw new Error('Could not authenticate with API');
        }

        // if we are close to exceeding the rate limit, back off and wait 100ms
        if (await BaseAPI.requestCount() >= BaseAPI.requestLimit - 5) {
            await sleep(100);
        }

        // sets a key in the cache for the request, so that it can be counted towards our rate limit
        await BaseAPI.cache.set({ method, endpoint, params, payload, date: Date.now() }, {});

        // construct our headers
        const headers = new Headers();
        headers.set('accept', 'application/json');
        headers.set('authorization', `${BaseAPI.token?.token_type} ${BaseAPI.token?.access_token}`);

        // construct any query string parameters
        const qs = new URLSearchParams();
        for (const key in params) {
            qs.set(key, params[key]);
        }

        // perform the fetch request
        const response = await fetch(`${this.baseUrl}${endpoint}?${qs.toString()}`, {
            method,
            headers,
            json: (method === HTTP_METHOD.PATCH || method === HTTP_METHOD.POST || method === HTTP_METHOD.PUT)
                ? payload
                : undefined
        });

        if (!response.ok) {
            /**
             * If we received a 401 and this is our first attempt, chances are our token expired,
             * and we will attempt to re-authenticate and then retry this request. If authentication
             * fails, or we've already retried, we'll continue with our normal path and throw an error
             */
            if (response.status === 401 && !is_retry) {
                if (await this.authenticate()) {
                    return this.execute<Type>(method, endpoint, params, payload, true);
                }
            }

            throw new Error(`${response.url} [${response.status}] ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Performs an HTTP get request against the Starlink Enterprise API
     *
     * @param endpoint
     * @param params
     * @protected
     */
    protected async get<Type extends Starlink.Response = any> (
        endpoint: string,
        params: { [key: string]: any } = {}
    ): Promise<Type> {
        return this.execute(HTTP_METHOD.GET, endpoint, params);
    }

    /**
     * Performs an HTTP post request against the Starlink Enterprise API
     *
     * @param endpoint
     * @param payload
     * @protected
     */
    protected async post<Type extends Starlink.Response = any> (
        endpoint: string,
        payload?: object
    ): Promise<Type> {
        return this.execute(HTTP_METHOD.POST, endpoint, {}, payload);
    }

    /**
     * Performs an HTTP put request against the Starlink Enterprise API
     *
     * @param endpoint
     * @param payload
     * @protected
     */
    protected async put<Type extends Starlink.Response = any> (
        endpoint: string,
        payload?: object | string
    ): Promise<Type> {
        return this.execute(HTTP_METHOD.PUT, endpoint, {}, payload);
    }
}
