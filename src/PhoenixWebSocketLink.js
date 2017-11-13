import { print } from "graphql/language/printer";
import { Observable } from "apollo-link-core";
import { Socket as PhoenixSocket } from "phoenix";
//import { w3cwebsocket as W3CWebSocket } from "websocket";

export class PhoenixWebSocketLink {
  constructor(opts) {
    this._socket = !opts.socket
      ? new PhoenixSocket(opts.uri, opts)
      : opts.socket;

    try {
      this._socket.connect();
      this._joinChannel();
    } catch (err) {
      console.error(err);
    }
  }

  // Required by the NetworkInterface interface spec
  // param: { variables, extensions, operationName, query }
  request({ operationName, query, variables }) {
    query = print(query);
    // console.log('Phoenix apollo: operationName:', operationName)
    return new Observable(observer => {
      this._channel
        .push("doc", { operationName, query, variables })
        .receive("ok", response => {
          // console.log('operation response', response)
          observer.next(response);
          observer.complete();
        })
        .receive("ignore", response => {
          observer.next(response);
          observer.complete();
        })
        .receive("error", observer.error.bind(observer))
        .receive("timeout", observer.error.bind(observer));
    });
  }

  _joinChannel() {
    const CHANNEL_TOPIC = "__absinthe__:control";
    let channel = this._socket.channel(CHANNEL_TOPIC, {});
    this._channel = channel;
    channel.join();
    // .receive('ok', response => console.log(`Joined successfully ${CHANNEL_TOPIC}`, response))
    // .receive('error', response => { console.log(`Unable to join ${CHANNEL_TOPIC}`, response) })
  }
}
