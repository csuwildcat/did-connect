(function(){

  globalThis.ProtocolMessageEvent = class ProtocolMessageEvent extends MessageEvent {
    constructor(channel, event){
      let _event = {};
      let message = event.data;
      for (let z in event) _event[z] = event[z];
      _event.data = message.payload;
      super('protocolmessage', _event);
      this.channel = channel;
      this.protocol = channel.protocol;
      this.topic = message.topic;
      this.__message__ = message;
    }
    blockSender(){
      this.channel.blockOrigins([this.origin]);
    }
    sendResponse(response){
      if ('response' in this.__message__ || 'error' in this.__message__) return;
      this.__message__.response = response;
      this.channel.sendMessage(this.__message__);
    }
    sendError(error){
      if ('response' in this.__message__ || 'error' in this.__message__) return;
      this.__message__.error = error;
      this.channel.sendMessage(this.__message__);
    }
  }

  globalThis.ProtocolChannel = class ProtocolChannel {
    constructor(protocol, options = {}){
      this.protocol = protocol + ':';
      this.blocked = {};
      this.onMessage = options.onMessage;
      this.transactions = {};
      this.referrer = document.referrer;
      if (options.block) this.blockOrigins(options.block);
      this.connect = new Promise((resolve, reject) => {
        if (self === top) {
          let frame = this.frame = document.createElement('iframe');
              frame.style.display = 'none';
              frame.src = this.protocol;
              frame.addEventListener('load', e => {
                resolve(this.frame.contentWindow);
              }, { once: true });
          addEventListener('message', e => {
            if (e.source === frame.contentWindow) {
              this.handleMessage(e);
            }
          })
          document.documentElement.prepend(frame);
        }
        else if (self !== top && top === parent) {
          addEventListener('message', e => {
            if (e.source === top || e.origin === this.referrer || !this.blocked[e.origin]) {
              this.handleMessage(e);
            }
          });
          resolve(top, document.referrer);
        }
      });
    }
    sendMessage(topic, payload, options = {}){
      if (typeof topic === 'object') {
        return this.connect.then((target, origin = '*') => target.postMessage(topic, origin));
      }
      return new Promise((resolve, reject) => {
        this.connect.then((target, origin = '*') => {
          let id = crypto.getRandomValues(new Uint8Array(16)).join('');
          this.transactions[id] = {
            topic: topic,
            payload: payload,
            resolve: resolve,
            reject: reject
          }
          target.postMessage({ id: id, topic: topic, payload: payload }, origin);
        })
      })
    }
    async handleMessage(e){
      let message = e.data;
      let event = new ProtocolMessageEvent(this, e);
      let txn = this.transactions[message.id];
      if (txn) {
        delete this.transactions[message.id];
        if ('response' in message) txn.resolve(message.response);
        else txn.reject(message.error);
      }
      else {
        dispatchEvent(event);
      }
    }
    blockOrigins(origins){
      origins.forEach(origin => this.blocked[origin] = true)
    }
    unblockOrigins(origins){
      origins.forEach(origin => delete this.blocked[origin])
    }
  }
})();

(function(){

  let channel;
  function getChannel(){
    return channel || (channel = new ProtocolChannel('web+did'));
  }

  let isPage = self === top;
  let isFrame = !isPage && top === parent;

  if (isPage) {

    Navigator.prototype.did = {
      requestDID: async function(methods){
        return getChannel().sendMessage('requestDID', { methods: methods });
      },
      requestData: async function(definition){
        return getChannel().sendMessage('requestData', definition);
      }
    }
  
  }
  else if (isFrame) {
    
    let channel = getChannel();

    Navigator.prototype.did = {};
  
  }
      
})()