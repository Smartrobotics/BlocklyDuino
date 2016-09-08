// Text
var text_values = {
  run: "&#x25B6; 実行",
  running: "実行中",
  stop: "X 停止",
  wakeup: "起き上がる",
  rest: "休む"
}
// Blockly setup
var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');
var workspace = Blockly.inject(blocklyDiv,
  {toolbox: document.getElementById('toolbox'), media: '../../media/'});
var onresize = function(e) {
// Compute the absolute coordinates and dimensions of blocklyArea.
var element = blocklyArea;
var x = 0;
var y = 0;
do {
  x += element.offsetLeft;
  y += element.offsetTop;
  element = element.offsetParent;
} while (element);
// Position blocklyDiv over blocklyArea.
blocklyDiv.style.left = x + 'px';
blocklyDiv.style.top = y + 'px';
blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
};
window.addEventListener('resize', onresize, false);
onresize();

// Running code callbacks
function onDone() {
  $('#generateCode').html(text_values.run);
  console.log("Finished without error!");
}

function onFail(error) {
  $('#generateCode').html(text_values.run);
  console.log("An error occured: " + error);
}

function highlightBlock (id) {
  workspace.highlightBlock(id);
}

function wakeup() {
  $.getService("ALMotion", function (motion) {
    motion.wakeUp();
  });
}

function rest() {
  $.getService("ALMotion", function (motion) {
    motion.rest();
  });
}

function setVolumeValue(value) {
  document.getElementById("volumeVal").innerHTML = value;

  $.getService("ALAudioDevice", function (audiodevice) {
    audiodevice.setOutputVolume(Number(value));
  });
}

function getVolumeValue(){
  $.getService("ALAudioDevice", function (audiodevice) {
    audiodevice.getOutputVolume().done(function(value) {
      document.getElementById("volumeVal2").value = Number(value);
      document.getElementById("volumeVal").innerHTML = value;
    });
  });
}

function repeatFunction(time){
  setInterval("getVolumeValue()",time);
}

function onLoadButton(){
  hidePopUp("#loadOnlineName");
  var data = '';
  data = document.getElementById("loadOnlineNameURL").value;
  loadOnline(data);
}

$(function(){
  $("#popUp").dialog({
    autoOpen: false,
    height: 185,
    width: 350,
  });
  $("#loadOnlineName").dialog({
    autoOpen: false,
    height: 201,
    width: 350,
  });
  $("#popUpError").dialog({ autoOpen: false });
});

function hidePopUp(id){
  $(id).dialog("close");
}

function popUp(id, value){
  if (value === "unSave") {
    $("#popUpTextError").text("ファイルを保存できませんでした");
  } else if (value === "unLoad") {
    var txt = '';
    txt = document.getElementById("loadOnlineNameURL").value;
    $("#popUpTextError").text( txt + "ファイルを読み込めませんでした");
  } else {
    $("#popUpText").text(value);
  }
  $(id).dialog("open");
}

function uploadCode(code, callback) {
    var url = "http://127.0.0.1:8080/";
    var method = "POST";

    // You REALLY want async = true.
    // Otherwise, it'll block ALL execution waiting for server response.
    var async = true;

    var request = new XMLHttpRequest();
    
    request.onreadystatechange = function() {
        if (request.readyState != 4) { 
            return; 
        }
        
        var status = parseInt(request.status); // HTTP response status, e.g., 200 for "200 OK"
        var errorInfo = null;
        switch (status) {
        case 200:
            break;
        case 0:
            errorInfo = "code 0\n\nCould not connect to server at " + url + ".  Is the local web server running?";
            break;
        case 400:
            errorInfo = "code 400\n\nBuild failed - probably due to invalid source code.  Make sure that there are no missing connections in the blocks.";
            break;
        case 500:
            errorInfo = "code 500\n\nUpload failed.  Is the Arduino connected to USB port?";
            break;
        case 501:
            errorInfo = "code 501\n\nUpload failed.  Is 'ino' installed and in your path?  This only works on Mac OS X and Linux at this time.";
            break;
        default:
            errorInfo = "code " + status + "\n\nUnknown error.";
            break;
        };
        
        callback(status, errorInfo);
    };

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
    request.send(code);      
}

function uploadClick() {
    var code = Blockly.Arduino.workspaceToCode();

    alert("Ready to upload to Arduino.");
    
    uploadCode(code, function(status, errorInfo) {
        if (status == 200) {
            alert("Program uploaded ok");
        } else {
            alert("Error uploading program: " + errorInfo);
        }
    });
}

function resetClick() {
    var code = "void setup() {} void loop() {}";

    uploadCode(code, function(status, errorInfo) {
        if (status != 200) {
            alert("Error resetting program: " + errorInfo);
        }
    });
}

// autosave and reload features!
function autosave() {
  var encodedText = createSave();
  if ('localStorage' in window) {
    window.localStorage.setItem('sr_blocklyduino', encodedText);
  } else {
    Cookies.set('sr_blocklyduino', encodedText);
  }
}

function autoload() {
  var encodedText;
  if ('localStorage' in window && window.localStorage.sr_blocklyduino) {
    encodedText = window.localStorage.sr_blocklyduino;
  } else {
    encodedText = Cookies.get('sr_blocklyduino');
  }
  loadSave(encodedText);
}

function loadSave(encodedText) {
  if (encodedText) {
    var utf8 = atob(encodedText);
    var text = decode_utf8(utf8);
    var xml = Blockly.Xml.textToDom(text);
    workspace.clear();
    Blockly.Xml.domToWorkspace(workspace, xml);
  }
}

function createSave() {
  var xml = Blockly.Xml.workspaceToDom(workspace);
  var text = Blockly.Xml.domToText(xml);
  var utf8 = encode_utf8(text)
  return btoa(utf8);
}

// call this function to save the current project as a short code
// successCallback takes 1 argument: the string returned by API
// errorCallback takes 1 argument: the text of the error
function saveOnline(successCallback, errorCallback) {
  var encodedText = createSave();
  $.ajax({
      url: 'https://blockly-save.herokuapp.com/api/shorten',
      type: 'POST',
      dataType: 'JSON',
      data: {url: encodedText},
      crossDomain: true,
      success: function(data){
          console.log(data.shortUrl);
          console.log(data.subPath);
          popUp("#popUp",data.subPath);
          if (successCallback) {
        successCallback(data.subPath);
      }
      },
      error: function(jqXHR, textStatus, err) {
        console.log("Error: " + err);
        console.log(textStatus);
        popUp("#popUpError", "unSave");
        if (errorCallback) {
          errorCallback(textStatus);
        }
      }
    });
}

// call this function to import code into Blockly from previous save
// successCallback takes no argument
// errorCallback takes 1 argument: the text of the error
function loadOnline(importCode, successCallback, errorCallback) {
  $.ajax({
    url: 'https://blockly-save.herokuapp.com/' + importCode,
    type: 'POST',
    dataType: 'JSON',
    success: function(data){
      loadSave(data.encodedXml);
      if (successCallback) {
        successCallback();
      }
    },
      error: function(jqXHR, textStatus, err) {
        console.log("Error: " + err);
        console.log(textStatus);
        popUp("#popUpError", "unLoad");
        if (errorCallback) {
          errorCallback(textStatus);
        }
      }
  })
}

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
  return decodeURIComponent(escape(s));
}

// initialization
autoload();
workspace.addChangeListener(autosave);
