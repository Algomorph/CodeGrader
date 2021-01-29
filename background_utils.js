function sendPostXHTTPRequest(request, callback = null) {
    let xhttpRequest = new XMLHttpRequest();

    let method = request.method ? request.method.toUpperCase() : 'GET';
    xhttpRequest.open(method, request.url, true);

    if (method === 'POST') {
        xhttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }

    xhttpRequest.onreadystatechange = function () {
        if (xhttpRequest.readyState === XMLHttpRequest.DONE && callback !== null) {
            callback(xhttpRequest.responseText);
            xhttpRequest.onreadystatechange = xhttpRequest.open = xhttpRequest.send = null;
            xhttpRequest = null;
        }
    };

    xhttpRequest.send(request.data);
    // end of cross domain loading
}