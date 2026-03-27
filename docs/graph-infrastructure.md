graph TD
subgraph Host Environment
HostApp[Desktop Web App]
MFE[MFE Client <br/> Web Component]
HostApp --> |Injects <script>| MFE
end

    subgraph AirDevice Infrastructure
        Signaling[NestJS Signaling Server <br/> WebSocket/WebRTC]
        Redis[(Redis Cluster <br/> Pub/Sub & State)]
        CDN[Static Server / CDN <br/> Serves MFE Bundle]

        MFE <--> |WSS / SessionID| Signaling
        Signaling <--> |State/Scaling| Redis
    end

    subgraph Mobile Device
        MobileClient[Mobile Web App <br/> MediaDevices API]
        MobileClient <--> |WSS / WebRTC| Signaling
    end
