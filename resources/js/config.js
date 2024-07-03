(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { colors: [] };

  let colors = oldState.colors;


  document.querySelector('#select-folder-btn').addEventListener('click', () => {
    onFolderSelecting();
  });


  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'FOLDER_SELECTED':
        {
          vscode.getState('FOLDER_SELECTED', message);
          onFolderSelected(message);
          break;
        }
      case 'clearColors':
        {
          colors = [];
          updateColorList(colors);
          break;
        }

    }
  });

  function onFolderSelecting(color) {
    vscode.postMessage({ type: 'FOLDER_SELECTING' });
  }
  function onFolderSelected(message) {
    vscode.postMessage({ type: 'FOLDER_SELECTED', url: message.url });

  }
}());