import { Component } from '@angular/core';
import { Peer } from "peerjs";

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
  messages: string[] = [];
  otherPeerId = '';

  createPeer() {
    if (!this.peer) {
      this.peer = new Peer("maanyanaaya-dheeraj");
      this.receive();
    }
  }

  receive() {
    if (this.peer) {
      this.peer.on("connection", (conn) => {
        conn.on("data", (data) => {
          this.messages = [...this.messages, data as string]
          console.log(data);
        });
      });
    }
  }

  send() {
    if (this.peer) {
      const conn = this.peer.connect(this.otherPeerId);
      conn.on("open", () => {
        conn.send(this.message);
      });
    }
  }
}
