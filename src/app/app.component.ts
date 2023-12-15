import { Component, ElementRef, ViewChild } from '@angular/core';
import { Peer } from 'peerjs';

export interface IMessage {
  peer: string;
  time: Date;
  message: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor() {}

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  title = 'demo-chat';

  peer: Peer | undefined;
  message = '';
  messages: IMessage[] = [];
  myPeerId = crypto.randomUUID();
  otherPeerId!: string;

  createPeer() {
    if (!this.peer) {
      this.peer = new Peer(this.myPeerId);
      this.onReceive();
      this.onCall();
    }
  }

  onReceive() {
    if (this.peer) {
      this.peer.on('connection', (conn) => {
        conn.on('data', (data) => {
          const time = new Date();
          const peerMessage: IMessage = {
            peer: 'sender',
            time: time,
            message: data as string,
          };
          this.messages = [...this.messages, peerMessage];
          console.log(data);
        });
      });
    }
  }

  onCall() {
    if (this.peer) {
      this.peer.on('call', async (call) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        this.localVideo.nativeElement.srcObject = stream;
        call.answer(stream); // Answer the call with an A/V stream.
        call.on('stream', (remoteStream) => {
          // Show stream in some <video> element.
          this.remoteVideo.nativeElement.srcObject = remoteStream;
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
        message: message,
      };
      this.message = '';
      this.messages = [...this.messages, myMessage];
      const conn = this.peer.connect(this.otherPeerId);
      conn.on('open', () => {
        conn.send(message);
      });
    }
  }

  async call() {
    if (this.peer) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localVideo.nativeElement.srcObject = stream;
      const call = this.peer.call(this.otherPeerId, stream);
      call.on('stream', (remoteStream) => {
        // Show stream in some <video> element.
        this.remoteVideo.nativeElement.srcObject = remoteStream;
      });
    }
  }
}
