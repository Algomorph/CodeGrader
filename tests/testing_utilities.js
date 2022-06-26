

function generateTrCodeLines(fileCode){
    const lines = fileCode.split("/n");
    return lines.map(line => {
            const trLine = document.createElement("tr");
            const text = document.createTextNode(line);
            trLine.appendChild(text);
            return trLine;
        }
    );
}

module.exports = {
  generateTrCodeLines
};