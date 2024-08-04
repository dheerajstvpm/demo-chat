import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Peer, { MediaConnection } from 'peerjs';
import { FormsModule } from '@angular/forms';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';

export interface IMessage {
  peer: string;
  peerMsgId: string;
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
  router = inject(Router);

  peer: Peer | undefined;
  mediaConnectionId = '';
  set myPeerId(id: string) {
    localStorage.setItem(`peerId`, id);
  }
  get myPeerId() { return localStorage.getItem(`peerId`) ?? crypto.randomUUID() };
  set otherPeerId(id: string) {
    localStorage.setItem(`otherPeerId`, id);
  }
  get otherPeerId() { return localStorage.getItem(`otherPeerId`) ?? `` };
  message = '';
  getAllMessages(): IMessage[] {
    try {
      return JSON.parse(localStorage.getItem(`messages`) ?? 'null') ?? [];
    } catch (error) {
      console.log(`err: ${error}`);
      return [];
    }
  }
  setMessage(value: IMessage) {
    const messages = JSON.stringify([...this.getAllMessages(), value]);
    localStorage.setItem(`messages`, messages);
  }
  get messages() {
    return this.getAllMessages().length ? this.getAllMessages().filter((item: IMessage) => item.peerMsgId === `${this.myPeerId}${this.otherPeerId}`) : [];
  }
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
      this.onReceive(this.peer);
      this.onCall(this.peer);
      this.onPeerDisconnect(this.peer);
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

  onReceive(peer: Peer) {
    peer.on('connection', (dataConnection) => {
      console.log('data connection established');
      dataConnection.on('data', (data) => {
        const time = new Date();
        const peerMessage: IMessage = {
          peer: 'sender',
          peerMsgId: `${this.myPeerId}${this.otherPeerId}`,
          time: time,
          message: data as string,
        };
        this.setMessage(peerMessage);
        console.log(data);
      });
    });
  }

  onCall(peer: Peer) {
    peer.on('call', async (mediaConnection) => {
      console.log('call connected');
      this.mediaConnectionId = mediaConnection.connectionId;
      this.audioEnabled = true;
      mediaConnection.answer(await this.setLocalStream());
      this.setRemoteStream(mediaConnection);
      this.onCallDisconnect(mediaConnection);
    });
  }

  onPeerDisconnect(peer: Peer) {
    peer?.on('error', (error) => {
      console.log(`peer error : ${error}`);
      this.disconnect();
    });
  }

  onCallDisconnect(connection: MediaConnection) {
    connection.on('close', () => {
      console.log('call disconnected');
      this.disconnect();
    })
    connection.on('error', (error) => {
      console.log(`call error : ${error}`);
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
        peerMsgId: `${this.myPeerId}${this.otherPeerId}`,
        time: time,
        message: message,
      };
      this.message = '';
      this.setMessage(myMessage);
      const dataConnection = this.peer.connect(this.otherPeerId);
      dataConnection.on('open', () => {
        dataConnection.send(message);
      });
    } else {
      this.createPeer();
      this.send();
    }
  }

  async call() {
    if (this.peer) {
      this.audioEnabled = true;
      const mediaConnection = this.peer.getConnection(this.otherPeerId, this.mediaConnectionId) ?? this.peer.call(this.otherPeerId, await this.setLocalStream());
      this.mediaConnectionId = mediaConnection.connectionId;
      this.setRemoteStream(mediaConnection as MediaConnection);
      this.onCallDisconnect(mediaConnection as MediaConnection);
    } else {
      this.createPeer();
      this.call();
    }
  }

  async toggleMute() {
    if (this.peer) {
      this.audioEnabled = !this.audioEnabled;
      this.peer?.call(this.otherPeerId, await this.setLocalStream());
    }
  }

  async toggleCamera() {
    this.videoEnabled = !this.videoEnabled;
    const mediaConnection = this.peer?.call(this.otherPeerId, await this.setLocalStream());
    console.log(this.mediaConnectionId === mediaConnection?.connectionId)
  }

  async disconnect() {
    this.peer?.getConnection(this.otherPeerId, this.mediaConnectionId)?.close();
    this.peer?.destroy();
    location.reload();
  }
}
