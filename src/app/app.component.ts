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
  myPeerId = "maanyanaaya-dheeraj";
  otherPeerId = "alavalaathi-rubeena";

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

  onCall() {
    if (this.peer) {
      this.peer.on("call", async (call) => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        call.answer(stream); // Answer the call with an A/V stream.
        call.on("stream", (remoteStream) => {
          // Show stream in some <video> element.
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

  async call() {
    if (this.peer) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const call = this.peer.call(this.otherPeerId, stream);
      call.on("stream", (remoteStream) => {
        // Show stream in some <video> element.
      });
    }
  }

}
