function init_ws(ws_port) {
  window.ws = new WebSocket(`ws://${location.hostname}:${ws_port}/`);
  ws.onmessage = (event) => {
    // console.warn(msg);
    msg = eval(event.data);
    // console.info(msg); //dbg
    recv[msg.t](msg); // msg.t is msg.type
  };

  ws.onopen = (event) => {
    // send auth msg to WS to welcome this new client
    ws.send(`{'t': 'welcome'}`);
    ws.send(`{'t': 'ls', 'd': ''}`);
    // TODO-future: support audio stream from Client's microphone to go into  in Server's virtual michrophone
  };

  ws.onerr = (event) => {
    init_ws(ws_port);
  };
}

// recv events for WS messages
window.recv = {
  shutdown: (msg) => {
    // TODO: close the app
    alert("shutdown");
  },
  ftp: (msg) => {
    //recv port of files' http server
    window.http_port = msg.p;
  },
  ls: (msg) => {
    //recv ls of current directory browsed in the cclient browser
    // clear current dir view then create these new elements
    dir_view.innerHTML = `<div class="item" style="display: none;">a temp css fix</div>`;
    // console.info(msg.ls);
    dir_name.innerHTML = "/" + msg.d;
    if (msg.d != "") {
      window.cwd = msg.d;
      if (!window.cwd.endsWith("/")) {
        window.cwd += "/";
      }
    } else {
      window.cwd = "";
    }

    for (let i = 0; i < msg.ls.length; i++) {
      create_item(msg.ls[i].n, msg.ls[i].t);
    }
    if (cwd === "") {
      // btn_back.disabled = true;
      btn_back.hidden = true;
    } else {
      // btn_back.disabled = false;
      btn_back.hidden = false;
    }
  },
  "http.server.start": (msg) => {
    window.custom_http_promise_resolve(msg.p);
  },
};

createElementFromHTML = (htmlString) => {
  var div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
};
getUrl = (item) => {
  return `${location.protocol}//${location.hostname}:${window.http_port}/${window.cwd}${item}`;
};
create_item = (name, type) => {
  var img = "imgs/unknown.svg";
  var item_url = getUrl(name);
  if (type === "dir") {
    img = "imgs/folder.svg";
  } else if (type.startsWith("image")) {
    img = item_url;
  } else if (type.startsWith("audio")) {
    img = "imgs/audio.svg";
  } else if (type.startsWith("video")) {
    img = "imgs/video.svg";
  } else if (type.endsWith("html")) {
    img = "imgs/html.svg";
  }
  // console.log(img);
  var html = `
  <div class="item pointer" item-name="${name}" item-type="${type}">
    <div class="item-preview">
      <img src="${img}" class="pointer" loading="lazy" alt="">
    </div>
    <div class="item-name d-flex">
      <p class="pointer" style="height: 100%; ${
        type === "dir" ? "" : "max-width: calc(100% - 34px);"
      }">${name}</p>
      ${
        type === "dir"
          ? ""
          : `
        <a href="${item_url}" download="${name}" class="pointer">
          <img src="imgs/download.svg" style="height: 100%; width: 30px;" class="pointer" onclick="this.parentElement.click();" />
        </a>
        `
      }
    </div>
    <br/>
  </div>
  `;
  var item = createElementFromHTML(html);
  var def_open_item = async (e) => {
    if (typeof e.target === "string") {
      alert(e.target);
      // don't execute this function in case of download button clicked
      if (e.target.startsWith(`${location.protocol}${location.hostname}`)) {
        alert(e.target);
        return;
      }
    }
    // on item click
    // console.log(`clicked(${name}, ${type})`);
    if (type === "dir") {
      ws.send(`{'t':'ls','d':'${window.cwd + name + "/"}'}`);
      return;
    }
    if (type.startsWith("image")) {
      modal_preview_body.innerHTML = `
      <img src="${img}" loading="lazy" style="
        position: absolute;
        height: 100%;
        width: 100%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      ">
      `;
    } else if (type.startsWith("video")) {
      var video = createElementFromHTML(`
        <video style="
          position: absolute;
          height: 100%;
          width: 100%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        " controls autoplay>
          Your browser does not support the video element. 
        </video>
      `);
      switch (type) {
        case "video/x-matroska":
        case "video/mkv":
          video.src = item_url;
          break;

        default:
        case "video/mp4":
          video.appendChild(
            createElementFromHTML(`<source src="${item_url}" type="${type}">`)
          );
          break;
      }
      modal_preview_body.appendChild(video);
    } else if (type.startsWith("audio")) {
      modal_preview_body.innerHTML = `
      <audio style="
        position: absolute;
        height: 100%;
        width: 100%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      " controls autoplay>
        <source src="${item_url}" type="${type}">
        Your browser does not support the audio element. 
      </audio>
      `;
    } else if (type === "text/html") {
      // first request the server to open an http server on that directory [CWD]
      var custom_http_promise = new Promise((resolve, deny) => {
        ws.send(`{'t':'http.server.start', 'd': '${window.cwd}'}`);
        window.custom_http_promise_resolve = resolve;
      });
      window.custom_http_port = await custom_http_promise;
      delete window.custom_http_promise_resolve;
      delete custom_http_promise;
      // then open the url using that server port
      // on modal close: request the server to close that http server port
      modal_preview_body.innerHTML = `
            <iframe style="
              position: absolute;
              height: 100%;
              width: 100%;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              border: none;
            "
            src="${`${location.protocol}//${location.hostname}:${custom_http_port}/${name}`}">
            </iframe>
        `;
      // a workarround
      // window.open(item_url);
      // return;
    }
    if (img != "imgs/unknown.svg") {
      modal_preview_title.innerHTML = name;
      modal_preview.show();
    }
  };
  item.children[0].addEventListener("click", def_open_item);
  item.children[1].children[0].addEventListener("click", def_open_item);
  if (item.children[1].length > 1) {
    item.children[1].children[1].addEventListener("click", (e) => {
      e.preventDefault();
      window.open(item_url, "Download");
    });
  }
  dir_view.appendChild(item);
};
dir_view = document.getElementById("dir-view");
dir_name = document.getElementById("dir-name");
btn_back = document.getElementById("btn-back");
modal_preview = $("#modal-preview");
modal_preview.show = () => modal_preview.modal("show");
modal_preview_title = document.getElementById("modal-preview-title");
modal_preview_body = document.getElementById("modal-preview-body");
cwd = "";
btn_back.addEventListener("click", (e) => {
  if (cwd === "") {
    return;
  }
  var back_d = cwd.split("/").slice(0, -2).join("/");
  ws.send(`{'t':'ls','d':'${back_d}'}`);
});
document.getElementById("btn-refresh").addEventListener("click", (e) => {
  ws.send(`{'t':'ls','d':'${window.cwd}'}`);
});
document
  .getElementById("modal-preview-btn-close")
  .addEventListener("click", (e) => {
    modal_preview_body.innerHTML = "";
    ws.send(`{'t':'http.server.term','p':'${window.custom_http_port}'}`);
  });
init_ws(ws_port);

var dir_view_height = `calc(100% - ${dir_view.getBoundingClientRect().y}px)`;
dir_view.style.minHeight = dir_view_height;
dir_view.style.maxHeight = dir_view_height;
dir_view.style.height = dir_view_height;
