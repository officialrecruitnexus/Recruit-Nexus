(function(window) {
    class LocalVapi {
        constructor(apiKey) {
            this.apiKey = apiKey;
            this.vapiInstance = null;
        }

        async start(assistantId) {
            console.log("Recruit Nexus: Initializing Audio...");
            try {
                
                const VapiSDK = window.vapi || window.VapiWeb;
                
                if (!VapiSDK) {
                    console.error("Vapi SDK not found. Loading from CDN...");
                    return;
                }

                await navigator.mediaDevices.getUserMedia({ audio: true });

                
                this.vapiInstance = new VapiSDK(this.apiKey);

                
                this.vapiInstance.on('call-start', () => {
                    console.warn("Riley is speaking!");
                    document.getElementById('status').innerText = "Riley is speaking...";
                });

                this.vapiInstance.on('call-end', () => {
                    console.log("Call ended");
                    document.getElementById('status').innerText = "Interview Ended";
                });

                this.vapiInstance.on('error', (error) => {
                    console.error("Vapi Error:", error);
                });

                
                await this.vapiInstance.start(assistantId);

            } catch (err) {
                console.error("Critical Error:", err);
                alert("Riley will not be able to speak because microphone permission has not been granted.");
            }
        }
        
        
        on(event, callback) {
            if (this.vapiInstance) {
                this.vapiInstance.on(event, callback);
            }
        }
    }
    window.Vapi = LocalVapi;
})(window);