import sendMessage from 'src/instrumentation/send-message/';
import vmBehavior from 'src/instrumentation/agent/behaviors/viewmodel';

class Agent {
  constructor (can) {
    this.can = can;

    this.selectedElement = null;
    this.behaviors = [];

    this.initBehaviors();
    this.listen();
  }

  //Start listening for events from content-script
  listen () {
    window.addEventListener('message', function(event) {
      var message = event.data;
      //!steal-remove-start
      console.log('-> Instrumentation', message);
      //!steal-remove-end
      if (!this.isValidMessage(event)) {
        return;
      }

      this.handleMessage(message);
    }.bind(this));
  }

  isValidMessage (event) {
    return event.source !== window ||
          typeof message !== 'object' ||
          message === null ||
          message.source !== 'can-devtools-content-script';
  }

  handleMessage (message) {
    var handler = this.handlers[message.name];
    if (!handler) {
      //!steal-remove-start
      console.warn('No handler found for event ' + message.name);
      //!steal-remove-end
      return;
    }

    handler.call(this, message.data);
  }

  initBehaviors () {
    this.behaviors.push(new vmBehavior(this.can, this.sendUpdate.bind(this)));
  }

  updateBehaviorsElement (el) {
    this.behaviors.forEach(function(b) {
      b.setElement(el);
    });
  }

  updateBehaviors (data) {
    this.behaviors.forEach(function(b) {
      if(data[b.name]) {
        b.update(data[b.name]);
      }
    });
  }

  getMessageFromBehaviors () {
    var message = {};
    this.behaviors.forEach(function(b) {
      message[b.name] = b.do();
    });
    return message;
  }

  sendUpdate () {
    var message = this.getMessageFromBehaviors();
    //TODO: circular objects
    sendMessage('update', JSON.stringify(message));
  }

  setSelectedElement (el) {
    this.selectedElement = el;
    this.updateBehaviorsElement(el);
    this.sendUpdate();
  }

};

Agent.prototype.handlers = {
  connect: function () {
    sendMessage('connected');
  },
  update: function (data) {
    this.updateBehaviors(data);
  },
};

export default Agent;
