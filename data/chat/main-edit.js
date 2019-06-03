/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint no-unused-expressions: 0 */

'use strict';
import {LitElement, html} from 'https://unpkg.com/@polymer/lit-element@0.6.2?module';

class MessagingSample extends LitElement {
  constructor() {
    super();
    this.connected = false;
  }

  disconnect() {
    this._localConnection.close();
    this._remoteConnection.close();
  }

  async connect() {
    console.log('connect!');
    try {
      const dataChannelParams = {ordered: true};
      window.localConnection = this._localConnection = new RTCPeerConnection();
      this._localConnection.addEventListener('icecandidate', async e => {
        console.log('local connection ICE candidate: ', e.candidate);
        await this._remoteConnection.addIceCandidate(e.candidate);
      });
      window.remoteConnection = this._remoteConnection = new RTCPeerConnection();
      this._remoteConnection.addEventListener('icecandidate', async e => {
        console.log('remote connection ICE candidate: ', e.candidate);
        await this._localConnection.addIceCandidate(e.candidate);
      });

      window.localChannel = this._localChannel = this._localConnection
        .createDataChannel('messaging-channel', dataChannelParams);
      this._localChannel.binaryType = 'arraybuffer';
      this._localChannel.addEventListener('open', () => {
        console.log('Local channel open!');
        this.connected = true;
      });
      this._localChannel.addEventListener('close', () => {
        console.log('Local channel closed!');
        this.connected = false;
      });
      this._localChannel.addEventListener('message', this._onLocalMessageReceived.bind(this));

      this._remoteConnection.addEventListener('datachannel', this._onRemoteDataChannel.bind(this));

      const initLocalOffer = async () => {
        const localOffer = await this._localConnection.createOffer();
        console.log(`Got local offer ${JSON.stringify(localOffer)}`);
        const localDesc = this._localConnection.setLocalDescription(localOffer);
        const remoteDesc = this._remoteConnection.setRemoteDescription(localOffer);
        return Promise.all([localDesc, remoteDesc]);
      };

      const initRemoteAnswer = async () => {
        const remoteAnswer = await this._remoteConnection.createAnswer();
        console.log(`Got remote answer ${JSON.stringify(remoteAnswer)}`);
        const localDesc = this._remoteConnection.setLocalDescription(remoteAnswer);
        const remoteDesc = this._localConnection.setRemoteDescription(remoteAnswer);
        return Promise.all([localDesc, remoteDesc]);
      };

      await initLocalOffer();
      await initRemoteAnswer();
    } catch (e) {
      console.log(e);
    }
  }

  _onLocalMessageReceived(event) {
    console.log(`Remote message received by local: ${event.data}`);
    this.localMessages += event.data + '\n';
  }

  _onRemoteDataChannel(event) {
    console.log(`onRemoteDataChannel: ${JSON.stringify(event)}`);
    window.remoteChannel = this._remoteChannel = event.channel;
    this._remoteChannel.binaryType = 'arraybuffer';
    this._remoteChannel.addEventListener('message', this._onRemoteMessageReceived.bind(this));
    this._remoteChannel.addEventListener('close', () => {
      console.log('Remote channel closed!');
      this.connected = false;
    });
  }

  _onRemoteMessageReceived(event) {
    console.log(`Local message received by remote: ${event.data}`);
    this.remoteMessages += event.data + '\n';
  }

  static get properties() {
    return {
      connected: {type: Boolean},
      localMessages: {type: String},
      remoteMessages: {type: String}
    };
  }

  render() {
    return html`<section>
  <style>
  @import "../../../css/main.css";
  @import "main.css";
  </style>
  <div>
      <button ?disabled="${this.connected}" @click="${this.connect.bind(this)}">Connect</button>
      <button ?disabled="${!this.connected}" @click="${this.disconnect.bind(this)}">Disconnect</button>
  </div>
<br/>
  <div class="messageBox">
      <label for="localOutgoing">Kirim Pesan:</label>
      <textarea class="message" id="localOutgoing" 
                placeholder="Ketik Pesan Anda."></textarea>
      <button ?disabled="${!this.connected}" @click="${e => this._sendMessage('#localOutgoing', this._localChannel)} 
      id="sendLocal">Kirim</button>
  </div>
 <br/>
 <br/>
  <div class="messageBox">
      <label for="remoteIncoming">Kotak Pesan:</label>
      <textarea class="message" id="remoteIncoming" disabled
                placeholder="Pesan yang dikirim disini.">${this.remoteMessages}</textarea>
  </div>
 
</section>`;
  }

  _sendMessage(selector, channel) {
    const textarea = this.shadowRoot.querySelector(selector);
    const value = textarea.value;
    if (value === '') {
      console.log('Not sending empty message!');
      return;
    }
    console.log('Sending remote message: ', value);
    channel.send(value);
    textarea.value = '';
  }
}

customElements.define('messaging-sample', MessagingSample);
