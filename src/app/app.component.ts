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

  createPeer() {
    if (!this.peer) {
      this.peer = new Peer("maanyanaaya-dheeraj");
      this.peer;
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
      const conn = this.peer.connect("alavalaathi-rubeena");
      conn.on("open", () => {
        conn.send(this.message);
      });
    }
  }
}
