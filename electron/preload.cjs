const { contextBridge, ipcRenderer } = require('electron');

/**
 * API segura para comunicação com o backend de biometria.
 * Usamos o contextBridge para expor apenas a funcionalidade necessária ao renderer,
 * evitando os riscos de segurança de habilitar o nodeIntegration.
 */
contextBridge.exposeInMainWorld('biometry', {
  /**
   * Envia um comando para o processo principal e aguarda uma resposta.
   * @param {object} command O objeto de comando (ex: { type: 'start-acquisition' }).
   * @returns {Promise<any>} A resposta do processo principal.
   */
  invoke: (command) => {
    // Validação de segurança: apenas o canal 'biometry-command' é permitido.
    return ipcRenderer.invoke('biometry-command', command);
  },

  /**
   * Registra um listener para eventos vindos do processo principal.
   * @param {function(object): void} callback A função a ser chamada com o evento.
   * @returns {void}
   */
  on: (callback) => {
    // Validação de segurança: apenas o canal 'biometry-event' é permitido.
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('biometry-event', subscription);

    // Retorna uma função para cancelar a inscrição e limpar o listener.
    return () => {
      ipcRenderer.removeListener('biometry-event', subscription);
    };
  },
});
