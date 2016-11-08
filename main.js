var name,
    connectedUser;

var connection = io();


connection.on('connect',function(){

  console.log('connected');

})


connection.on('message', function(message){
  console.log('message',message)
  var data = message;

  switch(data.type) {
    case "login":
      console.info(1, 'login');
      onLogin(data.success);
      break;
    case "offer":
      console.info(2, 'offer');
      onOffer(data.offer, data.name);
      break;
    case "answer":
      console.info(3, 'answer')
      onAnswer(data.answer);
      break;
    case "candidate":
      console.info(4, 'candidate')
      onCandidate(data.candidate);
      break;
    case "leave":
      console.info(5, "leave");
      onLeave();
      break;
    default:
      break;
  }
})
connection.connect = function () {
  console.log("Connected");
};


connection.onerror = function (err) {
  console.log("Got error", err);
};

// Alias for sending messages in JSON format
function send(message) {
  console.log('send', message);
  if (connectedUser) {
    message.name = connectedUser;
  }
  connection.emit('message', JSON.stringify(message));
};

var loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#username'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    theirUsernameInput = document.querySelector('#their-username'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up'),
    sendButton = document.querySelector('#send'),
    messageInput = document.querySelector('#message'),
    statusText = document.querySelector('#statusText'),
    sendFileButton = document.querySelector('#send-file')
    currentFile = []

callPage.style.display = "none";

// Login when the user clicks the button
loginButton.addEventListener("click", function (event) {
  name = usernameInput.value;

  if (name.length > 0) {

    send({
      type: "login",
      name: name
    });

  }

});

function onLogin(success) {

  if (success === false) {
    alert("Login unsuccessful, please try a different name.");
  } else {
    loginPage.style.display = "none";
    callPage.style.display = "block";

    // Get the plumbing ready for a call
    //login之后
    InitializeRTC()
    
  }
};

var yourVideo = document.querySelector('#yours'),
    theirVideo = document.querySelector('#theirs'),
    yourConnection, connectedUser, stream;

function startConnection() {

  navigator.getUserMedia(CONSTRAINTS, function (myStream) {
    stream = myStream;
    yourVideo.src = window.URL.createObjectURL(stream);

    if (hasRTCPeerConnection()) {
      //login 之后
      setupPeerConnection(stream);
    } else {
      alert("Sorry, your browser does not support WebRTC.");
    }
  }, function (error) {
    console.log(error);
  });


}

function setupPeerConnection(stream) {
  var configuration = {
    "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
    }]
  };
  yourConnection = new RTCPeerConnection(configuration);

  // Setup stream listening
  yourConnection.addStream(stream);
  yourConnection.onaddstream = function (e) {
    theirVideo.src = window.URL.createObjectURL(e.stream);
  };

  // Setup ice handling
  yourConnection.onicecandidate = function (event) {
    if (event.candidate) {
      send({
        type: "candidate",
        candidate: event.candidate
      });
    }
  };
  openDataChannel();
}

function hasUserMedia() {
  
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  return !!navigator.getUserMedia;
}

function hasRTCPeerConnection() {
  window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
  window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
  return !!window.RTCPeerConnection;
}

callButton.addEventListener("click", function () {
  var theirUsername = theirUsernameInput.value;

  if (theirUsername.length > 0) {
    startPeerConnection(theirUsername);
  }
});

//call
function startPeerConnection(user) {
  connectedUser = user;

  // Begin the offer
  yourConnection.createOffer(function (offer) {
    send({
      type: "offer",
      offer: offer
    });
    yourConnection.setLocalDescription(offer);

  }, function (error) {
    alert("An error has occurred.");
  });
};

function onOffer(offer, name) {
  connectedUser = name;

  yourConnection.setRemoteDescription(new RTCSessionDescription(offer));

  yourConnection.createAnswer(function (answer) {
    yourConnection.setLocalDescription(answer);

    send({
      type: "answer",
      answer: answer
    });

  }, function (error) {
    alert("An error has occurred");
  });

};

function onAnswer(answer) {

  yourConnection.setRemoteDescription(new RTCSessionDescription(answer));

};

function onCandidate(candidate) {
  yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

hangUpButton.addEventListener("click", function () {
  send({
    type: "leave"
  });

  onLeave();
});

sendButton.addEventListener("click", function (event) {
  var val = messageInput.value;
  received.innerHTML += val + "<br />";
  received.scrollTop = received.scrollHeight;
  console.log('send',val);
  dataChannelSend({
    type:'message',
    data:val
  })
});

sendFileButton.addEventListener("click", function (event) {
  var files = document.querySelector('#files').files;

  if (files.length > 0) {
    
    var reader = new FileReader();

    dataChannelSend({
      type: "start",
      data: fileToStringify(files[0])
    });

    sendFile(files[0]);
  }
});


function onLeave() {
  connectedUser = null;
  theirVideo.src = null;
  yourConnection.close();
  yourConnection.onicecandidate = null;
  yourConnection.onaddstream = null;
  setupPeerConnection(stream);
};

function openDataChannel() {
  var dataChannelOptions = {
    ordered: true,
    reliable: true,
    id: "myChannel"
  };
  dataChannel = yourConnection.createDataChannel("myLabel", dataChannelOptions);

  dataChannel.onerror = function (error) {
    console.log("Data Channel Error:", error);
  };

  dataChannel.onmessage = function (event) {
    console.log('message_event', event);
    var message;
    try {
      //如果不能解析说明是字符
      message = JSON.parse(event.data)
      switch (message.type) {
        case 'start':
          console.info('接受到的file', message.data);
          currentFile = [];
          currentFileSize = 0;
          currentFileMeta = message.data;
          break;
        case 'message':
          received.innerHTML += message.data + "<br />";
          received.scrollTop = received.scrollHeight;
          break;
        case 'end':
          saveFile(currentFileMeta, currentFile);
          break;

      }

    } catch(e) {

      currentFile.push(atob(event.data))

      currentFileSize += currentFile[currentFile.length - 1 ].length;

      var percentage = Math.floor((currentFileSize / currentFileMeta.size) * 100);

      statusText.innerHTML = "接受中 ... " + percentage +"%"

    }


  };

  dataChannel.onopen = function () {  
    dataChannelSend({
      type:'message',
      data:name + 'has connected'
    })
  };

  dataChannel.onclose = function () {
    console.log("The Data Channel is Closed");
  };
}
function hasFileApi(){
  return window.File && window.FileReader && window.FileList && window.Blob;
}

var CHUNK_MAX = 16000;
function sendFile(file) {
  
  var reader = new FileReader();

  reader.onloadend = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
      var buffer = reader.result,
          start = 0,
          end = 0,
          last = false;

      function sendChunk() {
        end = start + CHUNK_MAX;

        if (end > file.size) {
          end = file.size;
          last = true;
        }

        var percentage = Math.floor((end / file.size) * 100);
        statusText.innerHTML = "Sending... " + percentage + "%";

        dataChannel.send(arrayBufferToBase64(buffer.slice(start, end)));

        // If this is the last chunk send our end message, otherwise keep sending
        if (last === true) {
          dataChannelSend({
            type: "end"
          });
        } else {
          start = end;
          // Throttle the sending to avoid flooding
          setTimeout(function () {
            sendChunk();
          }, 100);

        }
      }

      sendChunk();
    }
  };

  reader.readAsArrayBuffer(file);
}
function dataChannelSend(data){
  dataChannel.send(JSON.stringify(data))
}
function base64ToBlob(b64Data, contentType) {
    contentType = contentType || '';

    var byteArrays = [], byteNumbers, slice;

    for (var i = 0; i < b64Data.length; i++) {

      slice = b64Data[i];

      byteNumbers = new Array(slice.length);

      for (var n = 0; n < slice.length; n++) {
          byteNumbers[n] = slice.charCodeAt(n);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}
function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return btoa(binary);
}

function saveFile(meta, data) {
  var blob = base64ToBlob(data, meta.type);
  var link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = meta.name;
  link.click();
}

function fileToStringify(obj){
  return{
    type:obj.type,
    name:obj.name,
    size:obj.size,
    lastModified:obj.lastModified
  }

}