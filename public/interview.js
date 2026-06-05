window.onload = () => {
    const btn = document.getElementById('start-btn');
    const status = document.getElementById('status');

    
    setTimeout(() => {
        const VapiSDK = window.Vapi || window.VapiWeb;

        if (VapiSDK) {
            console.log("Success: Vapi SDK is now defined!");
            status.innerText = "Ready to begin...";
            
            const vapi = new VapiSDK('5337c482-eba3-4168-8139-640605a107a7');
            const assistantId = 'c6a30223-7a5f-4eb2-bcce-596c98a6032b';

            btn.onclick = () => {
                status.innerText = "Connecting to Riley...";
                vapi.start(assistantId);
            };

            vapi.on('call-start', () => {
                status.innerText = "Interview in progress...";
                btn.style.display = "none";
            });

            vapi.on('call-end', () => {
                status.innerText = "Interview Completed!";
                btn.style.display = "block";
                btn.disabled = true;
            });

        } else {
            console.error("Critical: SDK still undefined after timeout.");
            status.innerHTML = "<span style='color:red;'>Network Blocked!</span><br>Use Personal Internet";
        }
    }, 1000); // 1 second wait for loading
};