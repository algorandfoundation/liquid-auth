export type RTCIceCandidateDto = {
  address: string;
  candidate: string;
  component: string;
  foundation: string;
  port: number;
  priority: number;
  protocol: string;
  relatedAddress: string;
  relatedPort: number;
  sdpMid: string;
  sdpMLineIndex: number;
  tcpType: string;
  usernameFragment?: string;
};
