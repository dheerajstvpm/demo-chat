import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { FormsModule } from '@angular/forms';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';

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
  route = inject(ActivatedRoute);

  peer: Peer | undefined;
  mediaConnectionId = '';
  dataConnectionId = '';
  inCognito = false;
  inCognitoMessages: IMessage[] = [];
  myPeerId = '1234';
  otherPeerId = '4321';
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
    if (this.inCognito) {
      this.inCognitoMessages = [...this.inCognitoMessages, value];
    } else if (!['c', 'vc', 'svc'].includes(value.message.toLowerCase())) {
      const messages = JSON.stringify([...this.getAllMessages(), value]);
      localStorage.setItem(`messages`, messages);
    }
  }
  get messages() {
    if (!this.inCognito) {
      return this.getAllMessages().length ? this.getAllMessages().filter((item: IMessage) => item.peerMsgId === `${this.myPeerId}${this.otherPeerId}`) : [];
    } else {
      return this.inCognitoMessages;
    }
  }
  callConnected = false;
  audioEnabled = true;
  videoEnabled = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const param1 = params['param1'];
      const param2 = params['param2'];
      if (param1) {
        this.myPeerId = param1;
        this.createPeer();
      }
      if (param2) this.otherPeerId = param2;
    });
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
      this.dataConnectionId = dataConnection.connectionId;
      dataConnection.on('data', (data) => {
        if (data === '#') {
          this.inCognito = true;
        }
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
      this.onChatDisconnect(dataConnection);
    });
  }

  onCall(peer: Peer) {
    peer.on('call', async (mediaConnection) => {
      console.log('call connected');
      this.mediaConnectionId = mediaConnection.connectionId;
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

  onChatDisconnect(connection: DataConnection) {
    connection.on('close', () => {
      console.log('chat disconnected');
      this.disconnect();
    })
    connection.on('error', (error) => {
      console.log(`chat error : ${error}`);
      this.disconnect();
    })
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
      this.disconnect();
      return;
    }
    if (this.message.toLowerCase() === '#') {
      this.inCognito = true;
    }
    if (this.message.toLowerCase() === 'c') {
      this.audioEnabled = true;
      this.videoEnabled = false;
      this.updateCall();
    }
    if (this.message.toLowerCase() === 'vc') {
      this.audioEnabled = true;
      this.videoEnabled = true;
      this.updateCall();
    }
    if (this.message.toLowerCase() === 'svc') {
      this.audioEnabled = false;
      this.videoEnabled = true;
      this.updateCall();
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
      this.dataConnectionId = dataConnection.connectionId;
      dataConnection.on('open', () => {
        dataConnection.send(message);
      });
    }
  }

  async call() {
    if (this.peer) {
      const mediaConnection = this.peer.call(this.otherPeerId, await this.setLocalStream());
      this.mediaConnectionId = mediaConnection.connectionId;
      this.setRemoteStream(mediaConnection as MediaConnection);
      this.onCallDisconnect(mediaConnection as MediaConnection);
    }
  }

  async updateCall() {
    this.peer?.call(this.otherPeerId, await this.setLocalStream());
  }

  async disconnect() {
    this.peer?.getConnection(this.otherPeerId, this.mediaConnectionId)?.close();
    this.peer?.getConnection(this.otherPeerId, this.dataConnectionId)?.close();
    this.peer?.destroy();
    location.reload();
  }
}
