fetch("Job Search.json")
.then(response => response.json())
.then(data => {
    let output = "";

    data.nodes.forEach(node => {
        output += `
            <div class="job-box">
                <h3>${node.name}</h3>
                <p>Type: ${node.type}</p>
            </div>
        `;
    });

    document.getElementById("jobResults").innerHTML = output;
})
.catch(error => console.log(error));