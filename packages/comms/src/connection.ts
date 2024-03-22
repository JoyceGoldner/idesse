import { join, promiseTimeout, scopedLogger } from "@hpcc-js/util";

const logger = scopedLogger("comms/connection.ts");

export type RequestType = "post" | "get" | "jsonp";
export type ResponseType = "json" | "text";

export type IOptionsSend = (options: IOptions, action: string, request: any, responseType: ResponseType, defaultSend: SendFunc, header?: any) => Promise<any>;
export interface IOptions {
    baseUrl: string;
    type?: RequestType;
    userID?: string;
    password?: string;
    rejectUnauthorized?: boolean;
    timeoutSecs?: number;
    hookSend?: IOptionsSend;
    encodeRequest?: boolean; // defaults to true
}
export function instanceOfIOptions(object: any): object is IOptions {
    return "baseUrl" in object;
}

const DefaultOptions: IOptions = {
    type: "post",
    baseUrl: "",
    userID: "",
    password: "",
    rejectUnauthorized: true,
    timeoutSecs: 60
};

export interface IConnection {
    opts(_: Partial<IOptions>): this;
    opts(): IOptions;
    baseUrl: string;

    send(action: string, request: any, responseType?: ResponseType): Promise<any>;
    clone(): IConnection;
}
export function instanceOfIConnection(object: any): object is IConnection {
    return typeof object.opts === "function" &&
        typeof object.send === "function" &&
        typeof object.clone === "function";
}

//  comms  ---

function encode(uriComponent: string | number | boolean, encodeRequest: boolean): string {
    return (encodeRequest === undefined || encodeRequest === true) ? encodeURIComponent(uriComponent) : "" + uriComponent;
}

export function serializeRequest(obj: any, encodeRequest: boolean = true, prefix: string = ""): string {
    if (prefix) {
        prefix += ".";
    }
    if (typeof obj !== "object") {
        return encode(obj, encodeRequest);
    }

    const str: string[] = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] instanceof Array) {
                //  Specific to ESP - but no REST standard exists...
                let includeItemCount = false;
                obj[key].forEach((row: any, i: number) => {
                    if (typeof row === "object") {
                        includeItemCount = true;
                        str.push(serializeRequest(row, encodeRequest, prefix + encode(`${key}.${i}`, encodeRequest)));
                    } else {
                        str.push(prefix + encode(`${key}_i${i}`, encodeRequest) + "=" + serializeRequest(row, encodeRequest));
                    }
                });
                if (includeItemCount) {
                    str.push(prefix + encode(`${key}.itemcount`, encodeRequest) + "=" + obj[key].length);
                }
            } else if (typeof obj[key] === "object") {
                if (obj[key] && obj[key]["Item"] instanceof Array) {  // Specific to ws_machine.GetTargetClusterInfo?
                    str.push(serializeRequest(obj[key]["Item"], encodeRequest, prefix + encode(key, encodeRequest)));
                    str.push(prefix + encode(`${key}.itemcount`, encodeRequest) + "=" + obj[key]["Item"].length);
                } else {
                    str.push(serializeRequest(obj[key], encodeRequest, prefix + encode(key, encodeRequest)));
                }
            } else if (obj[key] !== undefined) {
                str.push(prefix + encode(key, encodeRequest) + "=" + encode(obj[key], encodeRequest));
            } else {
                str.push(prefix + encode(key, encodeRequest));
            }
        }
    }
    return str.join("&");
}

export function deserializeResponse(body: string) {
    return JSON.parse(body);
}

export function jsonp(opts: IOptions, action: string, request: any = {}, responseType: ResponseType = "json", header?: any): Promise<any> {
    if (header) {
        console.warn("Header attributes ignored for JSONP connections");
    }
    return new Promise<any>((resolve, reject) => {
        let respondedTimeout = opts.timeoutSecs! * 1000;
        const respondedTick = 5000;
        const callbackName = "jsonp_callback_" + Math.round(Math.random() * 999999);
        (window as any)[callbackName] = function (response: any) {
            respondedTimeout = 0;
            doCallback();
            resolve(responseType === "json" && typeof response === "string" ? deserializeResponse(response) : response);
        };
        const script = document.createElement("script");
        let url = join(opts.baseUrl, action);
        url += url.indexOf("?") >= 0 ? "&" : "?";
        script.src = url + "jsonp=" + callbackName + "&" + serializeRequest(request, opts.encodeRequest);
        document.body.appendChild(script);
        const progress = setInterval(function () {
            if (respondedTimeout <= 0) {
                clearInterval(progress);
            } else {
                respondedTimeout -= respondedTick;
                if (respondedTimeout <= 0) {
                    clearInterval(progress);
                    logger.error("Request timeout:  " + script.src);
                    doCallback();
                    reject(Error("Request timeout:  " + script.src));
                } else {
                    logger.debug("Request pending (" + respondedTimeout / 1000 + " sec):  " + script.src);
                }
            }
        }, respondedTick);

        function doCallback() {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
        }
    });
}

function authHeader(opts: IOptions): object {
    return opts.userID ? { Authorization: `Basic ${btoa(`${opts.userID}:${opts.password}`)}` } : {};
}

//  _omitMap is a workaround for older HPCC-Platform instances without credentials ---
const _omitMap: { [baseUrl: string]: boolean } = {};
function doFetch(opts: IOptions, action: string, requestInit: RequestInit, headersInit: HeadersInit, responseType: string) {
    headersInit = {
        ...authHeader(opts),
        ...headersInit
    };

    requestInit = {
        credentials: _omitMap[opts.baseUrl] ? "omit" : "include",
        ...requestInit,
        headers: headersInit
    };

    if (opts.baseUrl.indexOf("https:") === 0) {
        //  NodeJS / node-fetch only  ---
        if (opts.rejectUnauthorized === false && fetch["__rejectUnauthorizedAgent"]) {
            requestInit["agent"] = fetch["__rejectUnauthorizedAgent"];
        } else if (fetch["__trustwaveAgent"]) {
            requestInit["agent"] = fetch["__trustwaveAgent"];
        }
    }

    function handleResponse(response: Response): Promise<any> {
        if (response.ok) {
            return responseType === "json" ? response.json() : response.text();
        }
        throw new Error(response.statusText);
    }

    return promiseTimeout(opts.timeoutSecs! * 1000, fetch(join(opts.baseUrl, action), requestInit)
        .then(handleResponse)
        .catch(e => {
            //  Try again with the opposite credentials mode  ---
            requestInit.credentials = !_omitMap[opts.baseUrl] ? "omit" : "include";
            return fetch(join(opts.baseUrl, action), requestInit)
                .then(handleResponse)
                .then(responseBody => {
                    _omitMap[opts.baseUrl] = !_omitMap[opts.baseUrl];  // The "opposite" credentials mode is known to work  ---
                    return responseBody;
                });
        })
    );
}

export function post(opts: IOptions, action: string, request: any, responseType: ResponseType = "json", header?: any): Promise<any> {
    if (request.upload_) {
        delete request.upload_;
        action += "?upload_";
    }
    let abortSignal;
    if (request.abortSignal_) {
        abortSignal = request.abortSignal_;
        delete request.abortSignal_;
    }
    return doFetch(opts, action, {
        method: "post",
        body: serializeRequest(request, opts.encodeRequest),
        signal: abortSignal
    }, {
        "Content-Type": "application/x-www-form-urlencoded",
        ...header
    } as any, responseType);
}

export function get(opts: IOptions, action: string, request: any, responseType: ResponseType = "json", header?: any): Promise<any> {
    let abortSignal;
    if (request.abortSignal_) {
        abortSignal = request.abortSignal_;
        delete request.abortSignal_;
    }
    return doFetch(opts, `${action}?${serializeRequest(request, opts.encodeRequest)}`, {
        method: "get",
        signal: abortSignal
    }, {
        ...header
    } as any, responseType);
}

export type SendFunc = (opts: IOptions, action: string, request: any, responseType: ResponseType, header?: any) => Promise<any>;
export function send(opts: IOptions, action: string, request: any, responseType: ResponseType = "json", header?: any): Promise<any> {
    let retVal: Promise<any>;
    switch (opts.type) {
        case "jsonp":
            retVal = jsonp(opts, action, request, responseType, header);
            break;
        case "get":
            retVal = get(opts, action, request, responseType, header);
            break;
        case "post":
        default:
            retVal = post(opts, action, request, responseType, header);
            break;
    }
    return retVal;
}

let hookedSend: SendFunc = send;
export function hookSend(newSend?: SendFunc): SendFunc {
    const retVal = hookedSend;
    if (newSend) {
        hookedSend = newSend;
    }
    return retVal;
}

export class Connection implements IConnection {
    protected _opts: IOptions;
    get baseUrl() { return this._opts.baseUrl; }

    constructor(opts: IOptions) {
        this.opts(opts);
    }

    //  IConnection  ---
    opts(_: Partial<IOptions>): this;
    opts(): IOptions;
    opts(_?: Partial<IOptions>): this | IOptions {
        if (arguments.length === 0) return this._opts;
        this._opts = { ...DefaultOptions, ..._ };
        return this;
    }

    send(action: string, request: any, responseType: ResponseType = "json", header?: any): Promise<any> {
        if (this._opts.hookSend) {
            return this._opts.hookSend(this._opts, action, request, responseType, hookedSend, header);
        }
        return hookedSend(this._opts, action, request, responseType, header);
    }

    clone() {
        return new Connection(this.opts());
    }
}

export type IConnectionFactory = (opts: IOptions) => IConnection;
export let createConnection: IConnectionFactory = function (opts: IOptions): IConnection {
    return new Connection(opts);
};

export function setTransportFactory(newFunc: IConnectionFactory): IConnectionFactory {
    const retVal = createConnection;
    createConnection = newFunc;
    return retVal;
}
