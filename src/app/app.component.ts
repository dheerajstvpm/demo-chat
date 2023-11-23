import { Component } from '@angular/core';
import { Peer } from "peerjs";

export interface IMessage {
  peer: string,
  time: Date,
  message: string
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {

  constructor() { }

  title = 'demo-chat';

  peer: Peer | undefined;
  message = ''
  messages: IMessage[] = [];
  myPeerId = "";
  otherPeerId = "";

  createPeer() {
    if (!this.peer) {
      this.peer = new Peer(this.myPeerId);
      this.receive();
    }
  }

  receive() {
    if (this.peer) {
      this.peer.on("connection", (conn) => {
        conn.on("data", (data) => {
          const time = new Date();
          const peerMessage: IMessage = {
            peer: 'sender',
            time: time,
            message: data as string
          };
          this.messages = [...this.messages, peerMessage]
          console.log(data);
        });
      });
    }
  }

  send() {
    if (this.message === '') {
      return;
    }
    if (this.peer) {
      const time = new Date();
      const message = this.message;
      const myMessage: IMessage = {
        peer: 'me',
        time: time,
        message: message
      };
      this.message = '';
      this.messages = [...this.messages, myMessage];
      const conn = this.peer.connect(this.otherPeerId);
      conn.on("open", () => {
        conn.send(message);
      });
    }
  }
}
