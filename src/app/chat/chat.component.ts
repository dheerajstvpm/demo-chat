import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Peer, { MediaConnection } from 'peerjs';
import { FormsModule } from '@angular/forms';
import { CdkDrag } from '@angular/cdk/drag-drop';

export interface IMessage {
  peer: string;
  time: Date;
  message: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDrag],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  title = 'demo-chat';

  peer: Peer | undefined;
  message = '';
  set messages(value: IMessage[]) {
    const messages = JSON.stringify(value);
    localStorage.setItem(`messages`, messages);
  }
  get messages() {
    let messages;
    try {
      messages = JSON.parse(localStorage.getItem(`messages`) ?? 'null');
    } catch (error) {
      console.log(error);
      messages = [];
    }
    return messages ?? [];
  }
  myPeerId = localStorage.getItem(`peerId`) ?? crypto.randomUUID();
  set otherPeerId(id: string) {
    localStorage.setItem(`otherPeerId`, id);
  }
  get otherPeerId() { return localStorage.getItem(`otherPeerId`) ?? `` };
  callConnected = false;
  audioEnabled = true;
  videoEnabled = false;

  ngOnInit(): void {
    this.createPeer();
  }

  createPeer() {
    if (!this.peer) {
      localStorage.setItem(`peerId`, this.myPeerId);
      this.peer = new Peer(this.myPeerId);
      this.onReceive();
      this.onCall();
      this.onPeerDisconnect();
    }
  }

  async setLocalStream() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: this.videoEnabled,
      audio: this.audioEnabled,
    });
    this.localVideo.nativeElement.srcObject = stream;
    return stream;
  }

  setRemoteStream(mediaConnection: MediaConnection) {
    mediaConnection.on('stream', (remoteStream) => {
      this.remoteVideo.nativeElement.srcObject = remoteStream;
      this.callConnected = true;
    });
  }

  onReceive() {
    this.peer?.on('connection', (conn) => {
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

  onCall() {
    this.peer?.on('call', async (call) => {
      this.audioEnabled = true;
      call.answer(await this.setLocalStream());
      this.setRemoteStream(call);
      this.onCallDisconnect(call);
    });
  }

  onPeerDisconnect() {
    this.peer?.on('close', () => {
      this.disconnect();
    })
    this.peer?.on('disconnected', () => {
      this.disconnect();
    });
    this.peer?.on('error', () => {
      this.disconnect();
    });
  }

  onCallDisconnect(connection: MediaConnection) {
    connection.on('close', () => {
      connection.close();
      this.disconnect();
    })
    connection.on('error', () => {
      connection.close();
      this.disconnect();
    })
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
    } else {
      this.createPeer();
      this.send();
    }
  }

  async call() {
    if (this.peer) {
      this.audioEnabled = true;
      const call = this.peer.call(this.otherPeerId, await this.setLocalStream());
      this.setRemoteStream(call);
      this.onCallDisconnect(call);
    } else {
      this.createPeer();
      this.call();
    }
  }

  async toggleMute() {
    this.audioEnabled = !this.audioEnabled;
    this.peer?.call(this.otherPeerId, await this.setLocalStream());
  }

  async toggleCamera() {
    if (this.peer) {
      this.videoEnabled = !this.videoEnabled;
      this.peer.call(this.otherPeerId, await this.setLocalStream());
    }
  }

  async disconnect() {
    this.callConnected = false;
    this.localVideo.nativeElement.srcObject = null;
    this.remoteVideo.nativeElement.srcObject = null;
    const stream = await this.setLocalStream();
    stream.getTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    })
    this.peer?.destroy();
    this.peer = undefined;
  }
}
