import { IConnection, IOptions } from "../../../../connection";
import { Service } from "../../../../espConnection";

export namespace WsElk {

export interface GetConfigDetailsRequest {

}

export interface GetConfigDetailsResponse {
    IntegrateKibana: boolean;
    KibanaAddress: string;
    KibanaPort: string;
    KibanaEntryPointURI: string;
    ReportElasticSearchHealth: boolean;
    ElasticSearchAddresses: string;
    ElasticSearchPort: string;
    ReportLogStashHealth: boolean;
    LogStashAddress: string;
    LogStashPort: string;
}

export interface ws_elkPingRequest {

}

export interface ws_elkPingResponse {

}

}

export class ElkServiceBase extends Service {

constructor(optsConnection: IOptions | IConnection) {
super(optsConnection, "ws_elk", "1");
}

GetConfigDetails(request: WsElk.GetConfigDetailsRequest): Promise<WsElk.GetConfigDetailsResponse> {
	return this._connection.send("GetConfigDetails", request);
}

Ping(request: WsElk.ws_elkPingRequest): Promise<WsElk.ws_elkPingResponse> {
	return this._connection.send("Ping", request);
}

}
